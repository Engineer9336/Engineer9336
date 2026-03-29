from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, Request, HTTPException, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pymongo import ReturnDocument
import os
import logging
import bcrypt
import jwt
import base64
import io
import csv
import shutil
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import Optional, List
import asyncio
from pathlib import Path

from face_utils import detect_face, save_face, train_model, recognize_face, FACE_DATA_DIR, MODEL_PATH, OPENCV_AVAILABLE

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection with timeout for Atlas compatibility
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    socketTimeoutMS=10000
)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# JWT settings
JWT_ALGORITHM = "HS256"


def get_jwt_secret():
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# Pydantic models
class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterUserRequest(BaseModel):
    name: str
    employee_id: str
    face_images: List[str]


class MarkAttendanceRequest(BaseModel):
    face_image: str


# ─── Auth Routes ───
@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    return {"id": user_id, "email": user["email"], "name": user["name"], "role": user.get("role", "admin")}


@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


# ─── User Registration with Face Capture ───
@api_router.post("/users/register")
async def register_user(req: RegisterUserRequest, request: Request):
    await get_current_user(request)

    existing = await db.registered_users.find_one({"employee_id": req.employee_id})
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID already registered")

    if len(req.face_images) < 3:
        raise HTTPException(status_code=400, detail="At least 3 face samples required")

    # Get next label number for LBPH
    counter = await db.counters.find_one_and_update(
        {"_id": "user_label"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    label = counter["seq"]

    # Process face images
    saved_count = 0
    loop = asyncio.get_event_loop()
    for i, img_b64 in enumerate(req.face_images):
        try:
            if "," in img_b64:
                img_b64 = img_b64.split(",")[1]
            img_bytes = base64.b64decode(img_b64)
            face = await loop.run_in_executor(None, detect_face, img_bytes)
            if face is not None:
                await loop.run_in_executor(None, save_face, label, face, i)
                saved_count += 1
        except Exception as e:
            logger.error(f"Error processing face sample {i}: {e}")

    if saved_count < 3:
        # Clean up saved face data if not enough samples
        user_dir = FACE_DATA_DIR / str(label)
        if user_dir.exists():
            shutil.rmtree(user_dir)
        raise HTTPException(status_code=400, detail=f"Only {saved_count} valid face(s) detected. Need at least 3. Ensure face is clearly visible.")

    # Train model with all face data
    trained = await loop.run_in_executor(None, train_model)

    # Save user to database
    user_doc = {
        "name": req.name,
        "employee_id": req.employee_id,
        "label": label,
        "face_count": saved_count,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.registered_users.insert_one(user_doc)

    return {
        "id": str(result.inserted_id),
        "name": req.name,
        "employee_id": req.employee_id,
        "face_count": saved_count,
        "model_trained": trained
    }


# ─── Face Recognition Attendance ───
@api_router.post("/attendance/mark")
async def mark_attendance(req: MarkAttendanceRequest, request: Request):
    await get_current_user(request)

    # Check if any users are registered
    user_count = await db.registered_users.count_documents({})
    if user_count == 0:
        raise HTTPException(status_code=400, detail="No users registered yet. Please register users first.")

    if not MODEL_PATH.exists():
        raise HTTPException(status_code=400, detail="Face model not trained yet. Please register at least one user.")

    img_b64 = req.face_image
    if "," in img_b64:
        img_b64 = img_b64.split(",")[1]
    img_bytes = base64.b64decode(img_b64)

    loop = asyncio.get_event_loop()
    label, confidence = await loop.run_in_executor(None, recognize_face, img_bytes)

    if label is None:
        if confidence is not None:
            raise HTTPException(status_code=400, detail=f"Face not recognized (confidence: {confidence:.1f}). Try again with better lighting.")
        raise HTTPException(status_code=400, detail="No face detected. Please ensure your face is clearly visible in the camera.")

    # Find user by label
    user = await db.registered_users.find_one({"label": label}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Face recognized but user not found in database.")

    # Duplicate prevention: one attendance per day
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.attendance.find_one({"employee_id": user["employee_id"], "date": today})
    if existing:
        raise HTTPException(status_code=400, detail=f"Attendance already marked for {user['name']} today.")

    # Mark attendance
    now = datetime.now(timezone.utc)
    attendance_doc = {
        "name": user["name"],
        "employee_id": user["employee_id"],
        "date": today,
        "time": now.strftime("%H:%M:%S"),
        "timestamp": now.isoformat(),
        "confidence": round(confidence, 2)
    }
    await db.attendance.insert_one(attendance_doc)

    return {
        "message": f"Attendance marked successfully for {user['name']} at {now.strftime('%H:%M:%S')}",
        "name": user["name"],
        "employee_id": user["employee_id"],
        "time": now.strftime("%H:%M:%S"),
        "date": today,
        "confidence": round(confidence, 2)
    }


# ─── Attendance Logs ───
@api_router.get("/attendance/logs")
async def get_attendance_logs(request: Request, date: Optional[str] = None):
    await get_current_user(request)
    query = {}
    if date:
        query["date"] = date
    logs = await db.attendance.find(query, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    return logs


# ─── Export Attendance CSV ───
@api_router.get("/attendance/export")
async def export_attendance(request: Request, date: Optional[str] = None):
    await get_current_user(request)
    query = {}
    if date:
        query["date"] = date
    logs = await db.attendance.find(query, {"_id": 0}).sort("timestamp", -1).to_list(10000)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["name", "employee_id", "date", "time", "confidence"])
    writer.writeheader()
    for log in logs:
        writer.writerow({
            "name": log.get("name", ""),
            "employee_id": log.get("employee_id", ""),
            "date": log.get("date", ""),
            "time": log.get("time", ""),
            "confidence": log.get("confidence", "")
        })

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"}
    )


# ─── Registered Users ───
@api_router.get("/users")
async def get_users(request: Request):
    await get_current_user(request)
    users = await db.registered_users.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return users


@api_router.delete("/users/{employee_id}")
async def delete_user(employee_id: str, request: Request):
    await get_current_user(request)
    user = await db.registered_users.find_one({"employee_id": employee_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete face data directory
    label = user.get("label")
    if label is not None:
        user_dir = FACE_DATA_DIR / str(label)
        if user_dir.exists():
            shutil.rmtree(user_dir)

    await db.registered_users.delete_one({"employee_id": employee_id})

    # Retrain model without the deleted user
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, train_model)

    return {"message": "User deleted successfully"}


# ─── Dashboard Stats ───
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    await get_current_user(request)

    total_users = await db.registered_users.count_documents({})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_attendance = await db.attendance.count_documents({"date": today})
    total_attendance = await db.attendance.count_documents({})

    # Last 7 days attendance data
    weekly_data = []
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        count = await db.attendance.count_documents({"date": d})
        weekly_data.append({"date": d, "count": count})

    return {
        "total_users": total_users,
        "today_attendance": today_attendance,
        "total_attendance": total_attendance,
        "attendance_rate": round((today_attendance / total_users * 100) if total_users > 0 else 0, 1),
        "weekly_data": weekly_data
    }


# ─── Health Check ───
@api_router.get("/")
async def root():
    return {"message": "Face Attendance API is running"}


@api_router.get("/health")
async def health_check():
    """Dedicated health check endpoint for Kubernetes liveness/readiness probes."""
    health = {"status": "healthy", "opencv_available": OPENCV_AVAILABLE}
    try:
        await db.command("ping")
        health["database"] = "connected"
    except Exception as e:
        health["database"] = f"error: {str(e)}"
        health["status"] = "degraded"
    return health


# ─── Admin Seeding ───
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info("Admin password updated")


@app.on_event("startup")
async def startup():
    try:
        # Test MongoDB connection first
        await db.command("ping")
        logger.info("MongoDB connection successful")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        # Don't crash - let the app start and health check will report degraded

    try:
        await seed_admin()
    except Exception as e:
        logger.error(f"Admin seeding failed: {e}")

    try:
        await db.users.create_index("email", unique=True)
        await db.registered_users.create_index("employee_id", unique=True)
        await db.attendance.create_index([("employee_id", 1), ("date", 1)])
    except Exception as e:
        logger.error(f"Index creation failed: {e}")

    try:
        FACE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.error(f"Face data directory creation failed: {e}")

    logger.info(f"Application started successfully (OpenCV: {OPENCV_AVAILABLE})")


@app.on_event("shutdown")
async def shutdown():
    client.close()


# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

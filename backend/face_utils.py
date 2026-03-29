import cv2
import numpy as np
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

FACE_DATA_DIR = Path(__file__).parent / "face_data"
MODEL_PATH = FACE_DATA_DIR / "trained_model.yml"
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"

face_cascade = cv2.CascadeClassifier(CASCADE_PATH)


def detect_face(image_bytes):
    """Detect the largest face in an image and return it as a 200x200 grayscale region."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5, minSize=(80, 80))
    if len(faces) == 0:
        return None
    # Use the largest face
    faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
    x, y, w, h = faces[0]
    face_region = gray[y:y + h, x:x + w]
    face_resized = cv2.resize(face_region, (200, 200))
    return face_resized


def save_face(user_label, face_image, sample_num):
    """Save a face image to disk under the user's label directory."""
    user_dir = FACE_DATA_DIR / str(user_label)
    user_dir.mkdir(parents=True, exist_ok=True)
    path = user_dir / f"face_{sample_num}.jpg"
    cv2.imwrite(str(path), face_image)
    return str(path)


def train_model():
    """Train LBPH model with all saved face images. Returns True if successful."""
    faces = []
    labels = []
    for user_dir in FACE_DATA_DIR.iterdir():
        if not user_dir.is_dir():
            continue
        try:
            label = int(user_dir.name)
        except ValueError:
            continue
        for img_file in user_dir.glob("*.jpg"):
            img = cv2.imread(str(img_file), cv2.IMREAD_GRAYSCALE)
            if img is not None:
                faces.append(img)
                labels.append(label)
    if len(faces) == 0:
        logger.warning("No face data found for training")
        return False
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.train(faces, np.array(labels))
    recognizer.write(str(MODEL_PATH))
    logger.info(f"Model trained with {len(faces)} samples across {len(set(labels))} users")
    return True


def recognize_face(image_bytes, confidence_threshold=80):
    """Recognize a face from image bytes. Returns (label, confidence) or (None, confidence)."""
    if not MODEL_PATH.exists():
        return None, None
    face = detect_face(image_bytes)
    if face is None:
        return None, None
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.read(str(MODEL_PATH))
    label, confidence = recognizer.predict(face)
    logger.info(f"Recognition result: label={label}, confidence={confidence:.2f}")
    # LBPH confidence is distance-based: lower = better match
    if confidence < confidence_threshold:
        return label, confidence
    return None, confidence

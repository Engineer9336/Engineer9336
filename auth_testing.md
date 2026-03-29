# Auth Testing Playbook

## Step 1: MongoDB Verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`, indexes exist on users.email (unique), attendance (employee_id + date).

## Step 2: API Testing
```
API_URL=https://attend-face-7.preview.emergentagent.com

# Login
curl -c cookies.txt -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"admin123"}'

# Check cookies
cat cookies.txt

# Get current user
curl -b cookies.txt "$API_URL/api/auth/me"

# Get dashboard stats
curl -b cookies.txt "$API_URL/api/dashboard/stats"

# Get attendance logs
curl -b cookies.txt "$API_URL/api/attendance/logs"

# Get users
curl -b cookies.txt "$API_URL/api/users"

# Export CSV
curl -b cookies.txt "$API_URL/api/attendance/export"

# Logout
curl -b cookies.txt -X POST "$API_URL/api/auth/logout"
```

## Admin Credentials
- Email: admin@example.com
- Password: admin123

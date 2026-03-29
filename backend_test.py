import requests
import sys
import json
from datetime import datetime

class FaceAttendanceAPITester:
    def __init__(self, base_url="https://attend-face-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_credentials = {
            "email": "admin@example.com",
            "password": "admin123"
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, params=params)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, None

    def test_health_check(self):
        """Test API health check"""
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login and get session cookies"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=self.admin_credentials
        )
        if success:
            # Check if cookies are set
            cookies = response.cookies
            if 'access_token' in cookies:
                print(f"   ✅ Access token cookie set")
            else:
                print(f"   ⚠️  No access token cookie found")
            return True
        return False

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User (/auth/me)",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success and response:
            try:
                data = response.json()
                required_fields = ['total_users', 'today_attendance', 'total_attendance', 'attendance_rate', 'weekly_data']
                for field in required_fields:
                    if field not in data:
                        print(f"   ⚠️  Missing field: {field}")
                        return False
                print(f"   ✅ All required stats fields present")
            except:
                print(f"   ❌ Invalid JSON response")
                return False
        return success

    def test_attendance_logs(self):
        """Test attendance logs endpoint"""
        success, response = self.run_test(
            "Attendance Logs",
            "GET",
            "attendance/logs",
            200
        )
        if success and response:
            try:
                data = response.json()
                if isinstance(data, list):
                    print(f"   ✅ Returns array with {len(data)} records")
                else:
                    print(f"   ❌ Expected array, got {type(data)}")
                    return False
            except:
                print(f"   ❌ Invalid JSON response")
                return False
        return success

    def test_attendance_logs_with_date(self):
        """Test attendance logs with date filter"""
        today = datetime.now().strftime("%Y-%m-%d")
        success, response = self.run_test(
            "Attendance Logs with Date Filter",
            "GET",
            "attendance/logs",
            200,
            params={"date": today}
        )
        return success

    def test_users_list(self):
        """Test registered users endpoint"""
        success, response = self.run_test(
            "Registered Users List",
            "GET",
            "users",
            200
        )
        if success and response:
            try:
                data = response.json()
                if isinstance(data, list):
                    print(f"   ✅ Returns array with {len(data)} users")
                else:
                    print(f"   ❌ Expected array, got {type(data)}")
                    return False
            except:
                print(f"   ❌ Invalid JSON response")
                return False
        return success

    def test_attendance_export(self):
        """Test CSV export endpoint"""
        success, response = self.run_test(
            "Attendance CSV Export",
            "GET",
            "attendance/export",
            200
        )
        if success and response:
            content_type = response.headers.get('content-type', '')
            if 'text/csv' in content_type:
                print(f"   ✅ Correct CSV content-type: {content_type}")
            else:
                print(f"   ⚠️  Unexpected content-type: {content_type}")
            
            content_disposition = response.headers.get('content-disposition', '')
            if 'attachment' in content_disposition:
                print(f"   ✅ Correct content-disposition: {content_disposition}")
            else:
                print(f"   ⚠️  Missing attachment header: {content_disposition}")
        return success

    def test_logout(self):
        """Test logout endpoint"""
        success, response = self.run_test(
            "Admin Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

    def test_unauthorized_access(self):
        """Test that protected endpoints require authentication after logout"""
        success, response = self.run_test(
            "Unauthorized Access (should fail)",
            "GET",
            "dashboard/stats",
            401  # Should be unauthorized after logout
        )
        return success

def main():
    print("🚀 Starting Face Attendance API Tests")
    print("=" * 50)
    
    tester = FaceAttendanceAPITester()
    
    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("Admin Login", tester.test_admin_login),
        ("Auth Me", tester.test_auth_me),
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Attendance Logs", tester.test_attendance_logs),
        ("Attendance Logs with Date", tester.test_attendance_logs_with_date),
        ("Users List", tester.test_users_list),
        ("CSV Export", tester.test_attendance_export),
        ("Logout", tester.test_logout),
        ("Unauthorized Access", tester.test_unauthorized_access),
    ]
    
    # Run all tests
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
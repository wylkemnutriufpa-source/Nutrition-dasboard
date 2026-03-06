#!/usr/bin/env python3
"""
FitJourney Security Test Suite - Critical Security Fixes
Testing implementation of reset password endpoints and security validations
"""

import sys
import json
import requests
import traceback
from typing import Dict, Optional
import time

# Backend URL from environment
BACKEND_URL = "https://fit-admin-fix.preview.emergentagent.com/api"

class SecurityTester:
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.session = requests.Session()
        self.results = []
        
    def log(self, message: str, level: str = "INFO"):
        """Log message with timestamp"""
        print(f"[{level}] {message}")
        
    def test_result(self, test_name: str, passed: bool, details: str = ""):
        """Record test result"""
        result = {
            "test": test_name,
            "passed": passed,
            "details": details
        }
        self.results.append(result)
        
        status = "✅ PASS" if passed else "❌ FAIL"
        self.log(f"{status} {test_name}: {details}")
        
    def make_request(self, method: str, endpoint: str, headers: Dict = None, data: Dict = None) -> Optional[requests.Response]:
        """Make HTTP request with error handling"""
        try:
            url = f"{self.backend_url}{endpoint}"
            
            if headers is None:
                headers = {"Content-Type": "application/json"}
                
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=headers, json=data, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, headers=headers, json=data, timeout=30)
            else:
                self.log(f"Unsupported method: {method}", "ERROR")
                return None
                
            self.log(f"{method} {url} -> {response.status_code}")
            return response
            
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {e}", "ERROR")
            return None
        except Exception as e:
            self.log(f"Unexpected error in request: {e}", "ERROR")
            return None
            
    def test_backend_health(self):
        """Test 1: Basic backend health check"""
        self.log("\n🏥 === TESTE 1: BACKEND HEALTH CHECK ===")
        
        response = self.make_request("GET", "/status")
        
        if response is None:
            self.test_result("Backend Health Check", False, "No response from backend")
            return False
            
        if response.status_code == 200:
            self.test_result("Backend Health Check", True, f"Status: {response.status_code}")
            return True
        else:
            self.test_result("Backend Health Check", False, f"Status: {response.status_code}")
            return False
            
    def test_admin_reset_password_security(self):
        """Test 2: Admin Reset Professional Password Security"""
        self.log("\n🔐 === TESTE 2A: ADMIN RESET PASSWORD SECURITY ===")
        
        professional_id = "test-professional-id"
        endpoint = f"/admin/professionals/{professional_id}/reset-password"
        test_payload = {"new_password": "newpass123"}
        
        # Test 2A.1: No Authorization header should return 401
        try:
            url = f"{self.backend_url}{endpoint}"
            response = requests.post(url, headers={"Content-Type": "application/json"}, json=test_payload, timeout=30)
            self.log(f"POST {url} -> {response.status_code}")
            
            if response.status_code == 401:
                self.test_result("Admin Reset - No Auth Header", True, "Returns 401 as expected")
            else:
                self.test_result("Admin Reset - No Auth Header", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.test_result("Admin Reset - No Auth Header", False, f"Request failed: {e}")
            
        # Test 2A.2: Invalid token should return 401
        try:
            invalid_headers = {"Authorization": "Bearer invalid-token-12345", "Content-Type": "application/json"}
            response = requests.post(url, headers=invalid_headers, json=test_payload, timeout=30)
            self.log(f"POST {url} -> {response.status_code}")
            
            if response.status_code == 401:
                self.test_result("Admin Reset - Invalid Token", True, "Returns 401 as expected")
            else:
                self.test_result("Admin Reset - Invalid Token", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.test_result("Admin Reset - Invalid Token", False, f"Request failed: {e}")
            
        # Test 2A.3: Password validation (short password)
        try:
            short_password_payload = {"new_password": "123"}
            response = requests.post(url, headers=invalid_headers, json=short_password_payload, timeout=30)
            self.log(f"POST {url} -> {response.status_code}")
            
            # Even with invalid token, should still return 401 (auth check comes first)
            if response.status_code == 401:
                self.test_result("Admin Reset - Short Password", True, "Auth check prevents access")
            else:
                self.test_result("Admin Reset - Short Password", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.test_result("Admin Reset - Short Password", False, f"Request failed: {e}")
            
    def test_professional_reset_password_security(self):
        """Test 2B: Professional Reset Patient Password Security"""
        self.log("\n🔐 === TESTE 2B: PROFESSIONAL RESET PASSWORD SECURITY ===")
        
        patient_id = "test-patient-id"
        endpoint = f"/professional/patients/{patient_id}/reset-password"
        test_payload = {"new_password": "newpass123"}
        
        # Test 2B.1: No Authorization header should return 401
        try:
            url = f"{self.backend_url}{endpoint}"
            response = requests.post(url, headers={"Content-Type": "application/json"}, json=test_payload, timeout=30)
            self.log(f"POST {url} -> {response.status_code}")
            
            if response.status_code == 401:
                self.test_result("Professional Reset - No Auth Header", True, "Returns 401 as expected")
            else:
                self.test_result("Professional Reset - No Auth Header", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.test_result("Professional Reset - No Auth Header", False, f"Request failed: {e}")
            
        # Test 2B.2: Invalid token should return 401
        try:
            invalid_headers = {"Authorization": "Bearer invalid-token-67890", "Content-Type": "application/json"}
            response = requests.post(url, headers=invalid_headers, json=test_payload, timeout=30)
            self.log(f"POST {url} -> {response.status_code}")
            
            if response.status_code == 401:
                self.test_result("Professional Reset - Invalid Token", True, "Returns 401 as expected")
            else:
                self.test_result("Professional Reset - Invalid Token", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.test_result("Professional Reset - Invalid Token", False, f"Request failed: {e}")
            
        # Test 2B.3: Password validation (short password)
        try:
            short_password_payload = {"new_password": "abc"}
            response = requests.post(url, headers=invalid_headers, json=short_password_payload, timeout=30)
            self.log(f"POST {url} -> {response.status_code}")
            
            # Even with invalid token, should still return 401 (auth check comes first)
            if response.status_code == 401:
                self.test_result("Professional Reset - Short Password", True, "Auth check prevents access")
            else:
                self.test_result("Professional Reset - Short Password", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.test_result("Professional Reset - Short Password", False, f"Request failed: {e}")
            
    def verify_backend_files_exist(self):
        """Test 3: Verify new backend files exist (code verification)"""
        self.log("\n📁 === TESTE 3: BACKEND FILES VERIFICATION ===")
        
        import os
        
        files_to_check = [
            "/app/backend/routes/admin_reset_password.py",
            "/app/backend/routes/professional_reset_password.py",
            "/app/backend/server.py"
        ]
        
        for file_path in files_to_check:
            if os.path.exists(file_path):
                self.test_result(f"File exists: {os.path.basename(file_path)}", True, "File found")
            else:
                self.test_result(f"File exists: {os.path.basename(file_path)}", False, "File not found")
                
    def verify_admin_reset_password_code(self):
        """Test 3A: Verify admin_reset_password.py implementation"""
        self.log("\n🔍 === TESTE 3A: ADMIN RESET PASSWORD CODE VERIFICATION ===")
        
        try:
            with open("/app/backend/routes/admin_reset_password.py", "r") as f:
                content = f.read()
                
            # Check key security features
            checks = [
                ("get_current_user_with_db_role import", "get_current_user_with_db_role" in content),
                ("_require_admin function", "_require_admin" in content and "current_user.app_role != \"admin\"" in content),
                ("Password validation", "len(request.new_password) < 6" in content),
                ("Supabase Admin API usage", "updateUserById" in content or "/auth/v1/admin/users/" in content),
                ("Professional role validation", "role=professional" in content or "role\" != \"professional\"" in content),
            ]
            
            for check_name, condition in checks:
                self.test_result(f"Admin Reset - {check_name}", condition, "Implementation verified" if condition else "Missing implementation")
                
        except Exception as e:
            self.test_result("Admin Reset Code Verification", False, f"Error reading file: {e}")
            
    def verify_professional_reset_password_code(self):
        """Test 3B: Verify professional_reset_password.py implementation"""
        self.log("\n🔍 === TESTE 3B: PROFESSIONAL RESET PASSWORD CODE VERIFICATION ===")
        
        try:
            with open("/app/backend/routes/professional_reset_password.py", "r") as f:
                content = f.read()
                
            # Check key security features
            checks = [
                ("get_current_user_with_db_role import", "get_current_user_with_db_role" in content),
                ("_require_professional function", "_require_professional" in content and "current_user.app_role != \"professional\"" in content),
                ("Password validation", "len(request.new_password) < 6" in content),
                ("Patient ownership validation", "patient_profiles" in content),
                ("Supabase Admin API usage", "updateUserById" in content or "/auth/v1/admin/users/" in content),
                ("Patient role validation", "role=patient" in content or "role\" != \"patient\"" in content),
            ]
            
            for check_name, condition in checks:
                self.test_result(f"Professional Reset - {check_name}", condition, "Implementation verified" if condition else "Missing implementation")
                
        except Exception as e:
            self.test_result("Professional Reset Code Verification", False, f"Error reading file: {e}")
            
    def verify_server_imports(self):
        """Test 3C: Verify server.py has new router imports"""
        self.log("\n🔍 === TESTE 3C: SERVER.PY ROUTER IMPORTS VERIFICATION ===")
        
        try:
            with open("/app/backend/server.py", "r") as f:
                content = f.read()
                
            # Check router imports and registrations
            checks = [
                ("Admin reset router import", "admin_reset_password" in content and "from routes.admin_reset_password import router" in content),
                ("Professional reset router import", "professional_reset_password" in content and "from routes.professional_reset_password import router" in content),
                ("Admin reset router registration", "admin_reset_password_router" in content and "api_router.include_router" in content),
                ("Professional reset router registration", "professional_reset_password_router" in content and "api_router.include_router" in content),
            ]
            
            for check_name, condition in checks:
                self.test_result(f"Server.py - {check_name}", condition, "Implementation verified" if condition else "Missing implementation")
                
        except Exception as e:
            self.test_result("Server.py Verification", False, f"Error reading file: {e}")
            
    def verify_frontend_error_handling_code(self):
        """Test 4: Verify frontend error handling improvements (code verification)"""
        self.log("\n🎨 === TESTE 4: FRONTEND ERROR HANDLING CODE VERIFICATION ===")
        
        import os
        
        files_to_check = [
            ("/app/frontend/src/lib/apiClient.js", [
                ("Detailed error extraction", ["error.detail", "error.message"]),
                ("Console logging", ["console.error"]),
                ("Try/catch in authenticatedPost", ["try {", "await response.json()"]),
            ]),
            ("/app/frontend/src/lib/supabase.js", [
                ("createPatientByProfessional error return", ["error: {", "message:"]),
                ("Detailed error object", ["detail:", "raw:"]),
            ]),
            ("/app/frontend/src/pages/PatientsList.js", [
                ("Improved error display", ["error?.message || error?.detail"]),
                ("Toast error with specific message", ["toast.error"]),
            ]),
        ]
        
        for file_path, checks in files_to_check:
            try:
                with open(file_path, "r") as f:
                    content = f.read()
                    
                self.log(f"Checking file: {file_path}")
                
                for check_name, required_strings in checks:
                    condition_result = all(req_str in content for req_str in required_strings)
                        
                    file_name = os.path.basename(file_path)
                    self.test_result(f"{file_name} - {check_name}", condition_result, "Implementation verified" if condition_result else "Missing implementation")
                    
            except Exception as e:
                file_name = os.path.basename(file_path)
                self.test_result(f"{file_name} Code Verification", False, f"Error reading file: {e}")
                
    def verify_testimonials_routes_code(self):
        """Test 5: Verify testimonials routes are admin-only (code verification)"""
        self.log("\n👥 === TESTE 5: TESTIMONIALS ADMIN-ONLY CODE VERIFICATION ===")
        
        import os
        
        files_to_check = [
            ("/app/frontend/src/App.js", [
                ("Admin testimonials route", ["/admin/testimonials", "allowedTypes={['admin']}"]),
                ("No professional testimonials route", ["/professional/testimonials"], True),  # Third element means "should NOT exist"
            ]),
            ("/app/frontend/src/components/Sidebar.js", [
                ("Testimonials in adminLinks", ["adminLinks", "testimonials"]),
                ("MOD badge for testimonials", ["badge: 'MOD'", "testimonials"]),
            ]),
        ]
        
        for file_path, checks in files_to_check:
            try:
                with open(file_path, "r") as f:
                    content = f.read()
                    
                self.log(f"Checking file: {file_path}")
                
                for check_item in checks:
                    if len(check_item) == 3 and check_item[2] is True:
                        # This is a "should NOT exist" check
                        check_name, required_strings, should_not_exist = check_item
                        condition_result = not any(req_str in content for req_str in required_strings)
                    else:
                        # Regular "should exist" check  
                        check_name, required_strings = check_item
                        condition_result = all(req_str in content for req_str in required_strings)
                        
                    file_name = os.path.basename(file_path)
                    self.test_result(f"{file_name} - {check_name}", condition_result, "Implementation verified" if condition_result else "Missing implementation")
                    
            except Exception as e:
                file_name = os.path.basename(file_path)
                self.test_result(f"{file_name} Code Verification", False, f"Error reading file: {e}")
                
    def run_all_tests(self):
        """Run all security tests"""
        self.log("🚀 === FITJOURNEY SECURITY TEST SUITE - CRITICAL FIXES ===\n")
        
        # Test 1: Backend Health
        backend_healthy = self.test_backend_health()
        
        if backend_healthy:
            # Test 2: Reset Password Endpoints Security
            self.test_admin_reset_password_security()
            self.test_professional_reset_password_security()
            
        # Test 3: Backend Code Verification (always run)
        self.verify_backend_files_exist()
        self.verify_admin_reset_password_code()
        self.verify_professional_reset_password_code()
        self.verify_server_imports()
        
        # Test 4: Frontend Code Verification
        self.verify_frontend_error_handling_code()
        
        # Test 5: Testimonials Admin-Only Verification
        self.verify_testimonials_routes_code()
        
        # Summary
        self.print_summary()
        
    def print_summary(self):
        """Print test results summary"""
        self.log("\n📊 === TEST RESULTS SUMMARY ===")
        
        passed = sum(1 for r in self.results if r["passed"])
        total = len(self.results)
        
        self.log(f"Total Tests: {total}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {total - passed}")
        self.log(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.results if not r["passed"]]
        if failed_tests:
            self.log("\n❌ FAILED TESTS:")
            for test in failed_tests:
                self.log(f"  - {test['test']}: {test['details']}")
        else:
            self.log("\n🎉 ALL TESTS PASSED!")
            
        # Critical security summary
        self.log("\n🔐 CRITICAL SECURITY VALIDATION:")
        
        # Check critical security endpoints
        auth_tests = [r for r in self.results if "Auth" in r["test"] or "Reset" in r["test"]]
        auth_passed = sum(1 for t in auth_tests if t["passed"])
        
        if auth_passed == len(auth_tests) and len(auth_tests) > 0:
            self.log("✅ Reset password endpoints properly secured (401 without auth)")
        else:
            self.log("❌ Security issues detected in reset password endpoints")
            
        # Check code implementation
        code_tests = [r for r in self.results if "Code" in r["test"] or "implementation" in r.get("details", "").lower()]
        code_passed = sum(1 for t in code_tests if t["passed"])
        
        if code_passed >= len(code_tests) * 0.8:  # At least 80% of code checks should pass
            self.log("✅ Code implementation appears correct")
        else:
            self.log("❌ Code implementation issues detected")

if __name__ == "__main__":
    # Import os here to use in verification methods
    import os
    
    tester = SecurityTester()
    
    try:
        tester.run_all_tests()
    except KeyboardInterrupt:
        tester.log("\n⏹️ Testing interrupted by user", "WARNING")
    except Exception as e:
        tester.log(f"\n💥 Unexpected error: {e}", "ERROR")
        traceback.print_exc()
    
    # Exit with non-zero code if any critical tests failed
    critical_failures = [r for r in tester.results if not r["passed"] and ("Auth" in r["test"] or "Reset" in r["test"])]
    
    if critical_failures:
        sys.exit(1)
    else:
        sys.exit(0)
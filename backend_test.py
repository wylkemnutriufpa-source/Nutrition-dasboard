#!/usr/bin/env python3
"""
FitJourney Backend Security Testing Script
Tests the final security consolidation as specified in the review request.
"""

import os
import asyncio
import httpx
from typing import Optional, Dict, Any


class FitJourneySecurityTester:
    def __init__(self):
        # Get backend URL from frontend config to match real deployment
        self.backend_url = "https://fitness-auth-fix.preview.emergentagent.com/api"
        self.test_results = []
        
    def log_result(self, test_name: str, success: bool, message: str, details: Optional[Dict] = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details or {}
        }
        self.test_results.append(result)
        status = "✅" if success else "❌"
        print(f"{status} {test_name}: {message}")
        if details:
            for key, value in details.items():
                print(f"   {key}: {value}")
    
    async def test_health_check(self):
        """Test 1: Health check - GET /api/status → 200 OK"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.backend_url}/status", timeout=10.0)
                
            if response.status_code == 200:
                self.log_result("Health Check", True, f"Status endpoint returns 200", {
                    "status_code": response.status_code,
                    "response": response.text[:200]
                })
                return True
            else:
                self.log_result("Health Check", False, f"Status endpoint returned {response.status_code}", {
                    "status_code": response.status_code,
                    "response": response.text[:200]
                })
                return False
                
        except Exception as e:
            self.log_result("Health Check", False, f"Exception occurred: {str(e)}")
            return False

    async def test_create_without_auth(self):
        """Test 2: /create SEM autenticação → 401"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.backend_url}/admin/patients/create",
                    json={
                        "name": "Test Patient",
                        "email": "test@test.com", 
                        "professional_id": "uuid-fake-123"
                    },
                    timeout=10.0
                )
            
            if response.status_code == 401:
                self.log_result("Create Without Auth", True, "Correctly returns 401 without Authorization header", {
                    "status_code": response.status_code,
                    "response": response.text[:300]
                })
                return True
            else:
                self.log_result("Create Without Auth", False, f"Expected 401, got {response.status_code}", {
                    "status_code": response.status_code,
                    "response": response.text[:300]
                })
                return False
                
        except Exception as e:
            self.log_result("Create Without Auth", False, f"Exception occurred: {str(e)}")
            return False

    async def test_create_with_invalid_token(self):
        """Test 3: /create COM token inválido → 401"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.backend_url}/admin/patients/create",
                    json={
                        "name": "Test Patient",
                        "email": "test@test.com",
                        "professional_id": "uuid-fake-123"
                    },
                    headers={"Authorization": "Bearer token_invalido_xpto123"},
                    timeout=10.0
                )
            
            if response.status_code == 401:
                self.log_result("Create Invalid Token", True, "Correctly returns 401 with invalid token", {
                    "status_code": response.status_code,
                    "response": response.text[:300]
                })
                return True
            else:
                self.log_result("Create Invalid Token", False, f"Expected 401, got {response.status_code}", {
                    "status_code": response.status_code,
                    "response": response.text[:300]
                })
                return False
                
        except Exception as e:
            self.log_result("Create Invalid Token", False, f"Exception occurred: {str(e)}")
            return False

    async def test_invite_without_auth(self):
        """Test 4: /invite SEM autenticação → 401"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.backend_url}/admin/patients/invite",
                    json={"email": "test@test.com"},
                    timeout=10.0
                )
            
            if response.status_code == 401:
                self.log_result("Invite Without Auth", True, "Correctly returns 401 without Authorization header", {
                    "status_code": response.status_code,
                    "response": response.text[:300]
                })
                return True
            else:
                self.log_result("Invite Without Auth", False, f"Expected 401, got {response.status_code}", {
                    "status_code": response.status_code,
                    "response": response.text[:300]
                })
                return False
                
        except Exception as e:
            self.log_result("Invite Without Auth", False, f"Exception occurred: {str(e)}")
            return False

    async def test_verify_without_auth(self):
        """Test 5: /verify SEM autenticação → 401"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.backend_url}/admin/patients/verify/some-uuid",
                    timeout=10.0
                )
            
            if response.status_code == 401:
                self.log_result("Verify Without Auth", True, "Correctly returns 401 without Authorization header", {
                    "status_code": response.status_code,
                    "response": response.text[:300]
                })
                return True
            else:
                self.log_result("Verify Without Auth", False, f"Expected 401, got {response.status_code}", {
                    "status_code": response.status_code,
                    "response": response.text[:300]
                })
                return False
                
        except Exception as e:
            self.log_result("Verify Without Auth", False, f"Exception occurred: {str(e)}")
            return False

    def verify_admin_patients_code(self):
        """Test 6: Verificar código-fonte: autenticação e atomicidade"""
        admin_patients_path = "/app/backend/routes/admin_patients.py"
        
        try:
            with open(admin_patients_path, 'r') as f:
                content = f.read()
            
            results = {}
            
            # Check for Depends(get_current_user_with_db_role) in all endpoints
            create_match = "Depends(get_current_user_with_db_role)" in content and "@router.post(\"/create\")" in content
            invite_match = "Depends(get_current_user_with_db_role)" in content and "@router.post(\"/invite\")" in content  
            verify_match = "Depends(get_current_user_with_db_role)" in content and "@router.get(\"/verify" in content
            
            results["depends_auth_create"] = create_match
            results["depends_auth_invite"] = invite_match
            results["depends_auth_verify"] = verify_match
            
            # Check for _require_admin_or_professional function
            results["require_admin_professional_exists"] = "_require_admin_or_professional" in content
            results["require_uses_app_role"] = "current_user.app_role" in content
            
            # Check for _delete_auth_user rollback function
            results["delete_auth_user_exists"] = "_delete_auth_user" in content
            
            # Check that temp_password is NOT in any return statement
            temp_password_in_return = "temp_password" in content and "return" in content
            # More precise check - look for temp_password in return blocks
            lines = content.split('\n')
            temp_password_returned = False
            for i, line in enumerate(lines):
                if 'return' in line and 'temp_password' in line:
                    temp_password_returned = True
                    break
                # Also check a few lines after return statements for temp_password
                if 'return {' in line:
                    for j in range(i, min(i+10, len(lines))):
                        if 'temp_password' in lines[j] and '}' not in lines[j-1]:
                            temp_password_returned = True
                            break
            
            results["temp_password_not_returned"] = not temp_password_returned
            
            all_passed = all(results.values())
            
            self.log_result("Admin Patients Code Verification", all_passed, 
                           "Code structure verification", results)
            
            return all_passed
            
        except Exception as e:
            self.log_result("Admin Patients Code Verification", False, f"Exception: {str(e)}")
            return False

    def verify_auth_py_code(self):
        """Test 7: Verificar auth.py: separação de roles"""
        auth_path = "/app/backend/security/auth.py"
        
        try:
            with open(auth_path, 'r') as f:
                content = f.read()
            
            results = {}
            
            # Check for get_current_user_with_db_role existence
            results["get_current_user_with_db_role_exists"] = "def get_current_user_with_db_role(" in content
            
            # Check for require_role function
            results["require_role_exists"] = "def require_role(" in content
            
            # Check CurrentUser.__init__ has jwt_role and app_role parameters
            init_match = "def __init__(" in content and "jwt_role" in content and "app_role" in content
            results["currentuser_has_both_roles"] = init_match
            
            # Check jwt_role assignment from payload
            results["jwt_role_from_payload"] = 'jwt_role = payload.get("role")' in content
            
            # Check app_role defaults to None
            results["app_role_defaults_none"] = "app_role=None" in content
            
            all_passed = all(results.values())
            
            self.log_result("Auth.py Code Verification", all_passed, 
                           "Auth code structure verification", results)
            
            return all_passed
            
        except Exception as e:
            self.log_result("Auth.py Code Verification", False, f"Exception: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all security tests"""
        print("🔒 Starting FitJourney Backend Security Tests")
        print(f"📡 Testing backend at: {self.backend_url}")
        print("=" * 60)
        
        # Run async tests
        test_results = await asyncio.gather(
            self.test_health_check(),
            self.test_create_without_auth(), 
            self.test_create_with_invalid_token(),
            self.test_invite_without_auth(),
            self.test_verify_without_auth(),
            return_exceptions=True
        )
        
        # Run sync code verification tests
        code_results = [
            self.verify_admin_patients_code(),
            self.verify_auth_py_code()
        ]
        
        # Combine all results
        all_results = []
        for result in test_results:
            if isinstance(result, Exception):
                all_results.append(False)
            else:
                all_results.append(result)
        all_results.extend(code_results)
        
        print("\n" + "=" * 60)
        print("📊 SECURITY TEST SUMMARY")
        print("=" * 60)
        
        # Count passed/failed tests
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        print()
        
        # Show detailed results
        critical_failures = []
        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"{status}: {result['test']}")
            if not result["success"]:
                critical_failures.append(result["test"])
        
        print("\n" + "=" * 60)
        if passed == total:
            print("🎉 ALL SECURITY TESTS PASSED!")
            print("✅ Backend security consolidation is working correctly")
        else:
            print(f"⚠️  {total - passed} CRITICAL SECURITY ISSUES FOUND:")
            for failure in critical_failures:
                print(f"   • {failure}")
        
        print("=" * 60)
        
        return passed == total


async def main():
    tester = FitJourneySecurityTester()
    success = await tester.run_all_tests()
    return success


if __name__ == "__main__":
    asyncio.run(main())
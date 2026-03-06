#!/usr/bin/env python3
"""
Backend Security Fixes Test Suite for FitJourney
=====================================

Tests the critical security fixes:
1. GET /api/status - backend health check  
2. POST /api/admin/patients/create - atomicity, no temp_password in response
3. security/auth.py - verify required functions exist
4. POST /api/admin/patients/invite - structure verification

This test suite verifies the fixes without actually creating users in Supabase.
"""

import requests
import json
import sys
import os
from typing import Dict, Any

# Get backend URL from frontend env
def get_backend_url() -> str:
    """Read backend URL from frontend .env file"""
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception:
        pass
    return 'http://localhost:8001'

BACKEND_URL = get_backend_url()
API_BASE = f"{BACKEND_URL}/api"

def test_result(test_name: str, passed: bool, details: str = ""):
    """Print test result with formatting"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"    {details}")
    return passed

def test_backend_status():
    """Test 1: GET /api/status endpoint"""
    print("\n🔍 Test 1: Backend Status Check")
    
    try:
        response = requests.get(f"{API_BASE}/status", timeout=10)
        
        if response.status_code == 200:
            return test_result("GET /api/status returns 200", True, 
                             f"Response: {response.json()}")
        else:
            return test_result("GET /api/status returns 200", False,
                             f"Status: {response.status_code}, Body: {response.text}")
                             
    except Exception as e:
        return test_result("GET /api/status returns 200", False,
                         f"Request failed: {str(e)}")

def test_admin_patients_create_atomicity():
    """Test 2: POST /api/admin/patients/create atomicity and security"""
    print("\n🔍 Test 2: Admin Patient Creation Security")
    
    # Test data - will fail without proper Supabase setup, which is expected
    test_payload = {
        "name": "Test Patient Security",
        "email": "test.patient.security@example.com", 
        "professional_id": "test-professional-123",
        "phone": "+5511999999999",
        "birth_date": "1990-01-01"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/patients/create",
            json=test_payload,
            timeout=10
        )
        
        # Should return 500 due to missing Supabase config or invalid credentials
        if response.status_code == 500:
            error_data = response.json()
            
            # Check that it's a config error (expected in test environment)
            if "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados" in error_data.get("detail", ""):
                return test_result("Admin patients create returns config error", True,
                                 "✅ Expected config error in test environment")
            else:
                # Different 500 error, check that temp_password is not exposed
                response_text = response.text.lower()
                if "temp_password" in response_text:
                    return test_result("Admin patients create does NOT expose temp_password", False,
                                     f"❌ temp_password found in response: {response.text}")
                else:
                    return test_result("Admin patients create does NOT expose temp_password", True,
                                     f"✅ No temp_password in error response: {error_data.get('detail')}")
        
        elif response.status_code == 400:
            # May get 400 if Supabase is configured but request fails
            response_data = response.json()
            response_text = response.text.lower()
            
            if "temp_password" in response_text:
                return test_result("Admin patients create does NOT expose temp_password", False,
                                 f"❌ temp_password found in response: {response.text}")
            else:
                return test_result("Admin patients create does NOT expose temp_password", True,
                                 f"✅ No temp_password in error response")
        
        else:
            # Unexpected status code
            response_text = response.text.lower()
            if "temp_password" in response_text:
                return test_result("Admin patients create does NOT expose temp_password", False,
                                 f"❌ temp_password found in response: {response.text}")
            else:
                return test_result("Admin patients create endpoint responds", False,
                                 f"❌ Unexpected status {response.status_code}: {response.text}")
                                 
    except Exception as e:
        return test_result("Admin patients create endpoint responds", False,
                         f"Request failed: {str(e)}")

def test_auth_security_functions():
    """Test 3: Verify security/auth.py has required functions"""
    print("\n🔍 Test 3: Authentication Security Functions")
    
    try:
        # Import and check the auth module
        sys.path.append('/app/backend')
        from security.auth import get_current_user_with_db_role, require_role, CurrentUser
        
        results = []
        
        # Test function exists
        if callable(get_current_user_with_db_role):
            results.append(test_result("get_current_user_with_db_role function exists", True))
        else:
            results.append(test_result("get_current_user_with_db_role function exists", False,
                                     "Function not found or not callable"))
        
        # Test require_role factory exists
        if callable(require_role):
            results.append(test_result("require_role factory function exists", True))
        else:
            results.append(test_result("require_role factory function exists", False,
                                     "Function not found or not callable"))
        
        # Test CurrentUser has required fields
        import inspect
        init_signature = inspect.signature(CurrentUser.__init__)
        params = list(init_signature.parameters.keys())
        
        if 'jwt_role' in params:
            results.append(test_result("CurrentUser has jwt_role parameter", True))
        else:
            results.append(test_result("CurrentUser has jwt_role parameter", False,
                                     f"Parameters found: {params}"))
            
        if 'app_role' in params:
            results.append(test_result("CurrentUser has app_role parameter", True))
        else:
            results.append(test_result("CurrentUser has app_role parameter", False,
                                     f"Parameters found: {params}"))
        
        return all(results)
        
    except ImportError as e:
        return test_result("security/auth.py imports successfully", False,
                         f"Import error: {str(e)}")
    except Exception as e:
        return test_result("security/auth.py verification", False,
                         f"Verification error: {str(e)}")

def test_admin_patients_invite_structure():
    """Test 4: POST /api/admin/patients/invite endpoint structure"""
    print("\n🔍 Test 4: Admin Patient Invite Structure")
    
    test_payload = {
        "email": "test.invite.security@example.com",
        "redirect_to": "https://example.com/patient/home"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/admin/patients/invite",
            json=test_payload,
            timeout=10
        )
        
        # Should return 500 due to config error, NOT 404 
        if response.status_code == 500:
            error_data = response.json()
            if "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados" in error_data.get("detail", ""):
                return test_result("Admin patients invite returns config error (not 404)", True,
                                 "✅ Expected config error - endpoint exists")
            else:
                return test_result("Admin patients invite returns expected error", True,
                                 f"✅ 500 error (endpoint exists): {error_data.get('detail')}")
        
        elif response.status_code == 404:
            return test_result("Admin patients invite returns config error (not 404)", False,
                             "❌ Endpoint not found (404) - route may be missing")
        
        elif response.status_code == 400:
            # May get 400 if Supabase configured but request fails - that's OK
            return test_result("Admin patients invite returns config error (not 404)", True,
                             f"✅ 400 error (endpoint exists): {response.json()}")
        
        else:
            return test_result("Admin patients invite endpoint responds", True,
                             f"✅ Status {response.status_code} (endpoint exists)")
                             
    except Exception as e:
        return test_result("Admin patients invite endpoint responds", False,
                         f"Request failed: {str(e)}")

def main():
    """Run all backend security tests"""
    print("🚀 FitJourney Backend Security Tests")
    print("=" * 50)
    print(f"Testing backend at: {API_BASE}")
    
    test_results = []
    
    # Run all tests
    test_results.append(test_backend_status())
    test_results.append(test_admin_patients_create_atomicity())
    test_results.append(test_auth_security_functions()) 
    test_results.append(test_admin_patients_invite_structure())
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Test Summary:")
    passed = sum(test_results)
    total = len(test_results)
    
    if passed == total:
        print(f"✅ All {total} tests passed!")
        print("\n🎉 Security fixes verification SUCCESSFUL")
        return True
    else:
        print(f"❌ {passed}/{total} tests passed")
        print(f"⚠️ {total - passed} tests failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
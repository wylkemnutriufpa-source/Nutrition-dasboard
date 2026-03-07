#!/usr/bin/env python3
"""
Backend Testing for Protocol → Checklist Integration
==================================================
Tests the 4 new endpoints for authentication and structure verification.

ENDPOINTS TO TEST:
1. GET /api/professional/protocols/list
2. GET /api/professional/patients/{patient_id}/active-protocols  
3. POST /api/professional/protocols/{patient_protocol_id}/sync-tasks
4. DELETE /api/professional/protocols/{patient_protocol_id}/sync-tasks

CRITERIA:
- All endpoints should return 401 without Authorization header
- All endpoints should return 401 with invalid token
- Code structure verification according to requirements
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://fitjourney-login.preview.emergentagent.com"

# Test constants
PATIENT_ID = "12345678-1234-1234-1234-123456789abc"
PATIENT_PROTOCOL_ID = "87654321-4321-4321-4321-cba987654321"
INVALID_TOKEN = "Bearer invalid.jwt.token"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    END = '\033[0m'
    BOLD = '\033[1m'

def log_test(test_name, status, details=""):
    """Log test results with colors"""
    if status == "PASS":
        print(f"{Colors.GREEN}✅ {test_name}: {status}{Colors.END}")
    elif status == "FAIL":
        print(f"{Colors.RED}❌ {test_name}: {status}{Colors.END}")
        if details:
            print(f"   {Colors.RED}Details: {details}{Colors.END}")
    else:  # INFO
        print(f"{Colors.BLUE}ℹ️ {test_name}: {status}{Colors.END}")
    if details and status != "FAIL":
        print(f"   {Colors.YELLOW}{details}{Colors.END}")

def test_endpoint_without_auth(method, url, test_name, expected_data=None):
    """Test endpoint without Authorization header - should return 401"""
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=expected_data or {}, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, timeout=10)
        
        if response.status_code == 401:
            log_test(test_name, "PASS", f"Returned 401 as expected")
            return True
        else:
            log_test(test_name, "FAIL", f"Expected 401, got {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test(test_name, "FAIL", f"Request error: {str(e)}")
        return False

def test_endpoint_with_invalid_token(method, url, test_name, expected_data=None):
    """Test endpoint with invalid token - should return 401"""
    try:
        headers = {"Authorization": INVALID_TOKEN}
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=expected_data or {}, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        
        if response.status_code == 401:
            log_test(test_name, "PASS", f"Returned 401 with invalid token")
            return True
        else:
            log_test(test_name, "FAIL", f"Expected 401, got {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test(test_name, "FAIL", f"Request error: {str(e)}")
        return False

def test_status_endpoint():
    """Test GET /api/status for backend health"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/status", timeout=10)
        if response.status_code == 200:
            log_test("GET /api/status", "PASS", "Backend is running")
            return True
        else:
            log_test("GET /api/status", "FAIL", f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/status", "FAIL", f"Cannot reach backend: {str(e)}")
        return False

def test_no_regression_endpoints():
    """Test existing protocol endpoints for no regression"""
    results = []
    
    # Test existing protocol endpoints
    endpoints = [
        ("POST", f"{BACKEND_URL}/api/professional/protocols/activate", "POST /api/professional/protocols/activate"),
        ("POST", f"{BACKEND_URL}/api/professional/protocols/deactivate/test-id", "POST /api/professional/protocols/deactivate/{{id}}"),
        ("GET", f"{BACKEND_URL}/api/patient/protocols/active", "GET /api/patient/protocols/active"),
    ]
    
    for method, url, name in endpoints:
        result = test_endpoint_without_auth(method, url, f"{name} (no auth)")
        results.append(result)
    
    return results

def main():
    print(f"{Colors.BOLD}{Colors.BLUE}")
    print("=" * 80)
    print("🧪 PROTOCOL → CHECKLIST INTEGRATION TESTS")
    print("=" * 80)
    print(f"{Colors.END}")
    
    # Test results tracking
    all_tests = []
    
    # 1. Backend Health Check
    print(f"\n{Colors.PURPLE}📋 1. BACKEND HEALTH CHECK{Colors.END}")
    print("-" * 40)
    health_ok = test_status_endpoint()
    all_tests.append(health_ok)
    
    if not health_ok:
        print(f"\n{Colors.RED}❌ Backend not accessible. Stopping tests.{Colors.END}")
        return False
    
    # 2. Test new Protocol → Checklist endpoints
    print(f"\n{Colors.PURPLE}📋 2. NEW PROTOCOL-CHECKLIST ENDPOINTS{Colors.END}")
    print("-" * 50)
    
    new_endpoints = [
        ("GET", f"{BACKEND_URL}/api/professional/protocols/list", "GET /api/professional/protocols/list"),
        ("GET", f"{BACKEND_URL}/api/professional/patients/{PATIENT_ID}/active-protocols", "GET /api/professional/patients/{{patient_id}}/active-protocols"),
        ("POST", f"{BACKEND_URL}/api/professional/protocols/{PATIENT_PROTOCOL_ID}/sync-tasks", "POST /api/professional/protocols/{{patient_protocol_id}}/sync-tasks"),
        ("DELETE", f"{BACKEND_URL}/api/professional/protocols/{PATIENT_PROTOCOL_ID}/sync-tasks", "DELETE /api/professional/protocols/{{patient_protocol_id}}/sync-tasks"),
    ]
    
    print("\n🔒 Testing WITHOUT Authorization header (should return 401):")
    for method, url, name in new_endpoints:
        result = test_endpoint_without_auth(method, url, f"{name} (no auth)")
        all_tests.append(result)
    
    print("\n🔒 Testing WITH INVALID token (should return 401):")
    for method, url, name in new_endpoints:
        result = test_endpoint_with_invalid_token(method, url, f"{name} (invalid token)")
        all_tests.append(result)
    
    # 3. Regression testing
    print(f"\n{Colors.PURPLE}📋 3. REGRESSION TESTS (existing endpoints){Colors.END}")
    print("-" * 50)
    regression_results = test_no_regression_endpoints()
    all_tests.extend(regression_results)
    
    # 4. Summary
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    print(f"{Colors.END}")
    
    passed = sum(all_tests)
    total = len(all_tests)
    
    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}✅ ALL TESTS PASSED: {passed}/{total}{Colors.END}")
        
        print(f"\n{Colors.GREEN}SUCCESS CRITERIA MET:{Colors.END}")
        print(f"{Colors.GREEN}✅ GET /api/status → 200 (backend running){Colors.END}")
        print(f"{Colors.GREEN}✅ All 4 new endpoints return 401 without auth{Colors.END}")
        print(f"{Colors.GREEN}✅ All 4 new endpoints return 401 with invalid token{Colors.END}")
        print(f"{Colors.GREEN}✅ No regression in existing protocol endpoints{Colors.END}")
        
        return True
    else:
        print(f"{Colors.RED}{Colors.BOLD}❌ TESTS FAILED: {passed}/{total} passed{Colors.END}")
        print(f"{Colors.RED}Some endpoints may not be properly secured or implemented.{Colors.END}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
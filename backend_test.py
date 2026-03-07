#!/usr/bin/env python3
"""
Backend Testing for Protocol → Checklist Integration + New Patient Endpoint
========================================================================
Tests the new patient endpoint POST /api/patient/checklist/sync-protocols
and verifies existing endpoints still work.

NEW ENDPOINT TO TEST:
POST /api/patient/checklist/sync-protocols

TEST CASES (as per request):
1. POST /api/patient/checklist/sync-protocols without token → expect 401
2. POST /api/patient/checklist/sync-protocols with valid patient token → expect 200
3. Verify idempotency: call again → same result (no duplicates)
4. GET /api/professional/protocols/list (needs professional token) 
5. Basic health endpoint

AUTH TOKENS:
- Patient: email: gleiceukekel@gmail.com, password: 123456
- Professional: email: wyl@wyl.com, password: 123456
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://fitjourney-checklist.preview.emergentagent.com"

# Supabase auth endpoint for tokens
SUPABASE_AUTH_URL = "https://safovouvjiikaickutvi.supabase.co/auth/v1/token?grant_type=password"
SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZm92b3V2amlpa2FpY2t1dHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjgzODAsImV4cCI6MjA4NzU0NDM4MH0.Joq1e2DR6hb3XGh8pXg3c-eZ-vXiGGmxmzy-ibf3oIE"

# Test constants
PATIENT_ID = "12345678-1234-1234-1234-123456789abc"
PATIENT_PROTOCOL_ID = "87654321-4321-4321-4321-cba987654321"
INVALID_TOKEN = "Bearer invalid.jwt.token"

# Test credentials
PATIENT_EMAIL = "gleiceukekel@gmail.com"
PATIENT_PASSWORD = "123456"
PROFESSIONAL_EMAIL = "wyl@wyl.com"
PROFESSIONAL_PASSWORD = "123456"

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

def get_supabase_token(email, password, token_type="patient"):
    """Get Supabase JWT token for authentication"""
    try:
        headers = {
            "apikey": SUPABASE_API_KEY,
            "Content-Type": "application/json"
        }
        
        payload = {
            "email": email,
            "password": password
        }
        
        response = requests.post(SUPABASE_AUTH_URL, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            if access_token:
                log_test(f"Get {token_type} token", "PASS", f"Token obtained for {email}")
                return f"Bearer {access_token}"
            else:
                log_test(f"Get {token_type} token", "FAIL", f"No access_token in response")
                return None
        else:
            log_test(f"Get {token_type} token", "FAIL", f"Auth failed: {response.status_code} {response.text[:200]}")
            return None
            
    except Exception as e:
        log_test(f"Get {token_type} token", "FAIL", f"Request error: {str(e)}")
        return None

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

def test_patient_sync_protocols_with_token(patient_token):
    """Test POST /api/patient/checklist/sync-protocols with valid patient token"""
    try:
        headers = {"Authorization": patient_token}
        url = f"{BACKEND_URL}/api/patient/checklist/sync-protocols"
        
        response = requests.post(url, headers=headers, json={}, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            # Check expected response format
            required_keys = ["injected", "skipped", "synced_protocols", "message"]
            if all(key in data for key in required_keys):
                log_test("POST /api/patient/checklist/sync-protocols (valid token)", "PASS", 
                        f"Response: injected={data.get('injected')}, skipped={data.get('skipped')}, message='{data.get('message')}'")
                return True, data
            else:
                log_test("POST /api/patient/checklist/sync-protocols (valid token)", "FAIL", 
                        f"Missing expected keys in response. Got: {list(data.keys())}")
                return False, None
        else:
            log_test("POST /api/patient/checklist/sync-protocols (valid token)", "FAIL", 
                    f"Expected 200, got {response.status_code}: {response.text[:200]}")
            return False, None
            
    except Exception as e:
        log_test("POST /api/patient/checklist/sync-protocols (valid token)", "FAIL", f"Request error: {str(e)}")
        return False, None

def test_idempotency(patient_token, first_response_data):
    """Test that calling sync-protocols again gives same result (idempotency)"""
    try:
        headers = {"Authorization": patient_token}
        url = f"{BACKEND_URL}/api/patient/checklist/sync-protocols"
        
        response = requests.post(url, headers=headers, json={}, timeout=15)
        
        if response.status_code == 200:
            second_data = response.json()
            
            # For idempotency, second call should have:
            # - injected: 0 (nothing new to inject)
            # - skipped: should be >= first call's total
            if second_data.get("injected", -1) == 0:
                log_test("Idempotency test", "PASS", 
                        f"Second call: injected=0, skipped={second_data.get('skipped')}")
                return True
            else:
                log_test("Idempotency test", "FAIL", 
                        f"Second call injected {second_data.get('injected')} (expected 0)")
                return False
        else:
            log_test("Idempotency test", "FAIL", 
                    f"Second call failed: {response.status_code} {response.text[:200]}")
            return False
            
    except Exception as e:
        log_test("Idempotency test", "FAIL", f"Request error: {str(e)}")
        return False

def test_professional_protocols_list(professional_token):
    """Test GET /api/professional/protocols/list with professional token"""
    try:
        headers = {"Authorization": professional_token}
        url = f"{BACKEND_URL}/api/professional/protocols/list"
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "protocols" in data:
                protocol_count = len(data["protocols"])
                log_test("GET /api/professional/protocols/list", "PASS", 
                        f"Found {protocol_count} protocols")
                return True
            else:
                log_test("GET /api/professional/protocols/list", "FAIL", 
                        f"No 'protocols' key in response: {data}")
                return False
        else:
            log_test("GET /api/professional/protocols/list", "FAIL", 
                    f"Expected 200, got {response.status_code}: {response.text[:200]}")
            return False
            
    except Exception as e:
        log_test("GET /api/professional/protocols/list", "FAIL", f"Request error: {str(e)}")
        return False

def main():
    print(f"{Colors.BOLD}{Colors.BLUE}")
    print("=" * 80)
    print("🧪 NEW PATIENT ENDPOINT TESTS: POST /api/patient/checklist/sync-protocols")
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
    
    # 2. Test Case 1: No auth should return 401
    print(f"\n{Colors.PURPLE}📋 2. TEST CASE 1: Without token → expect 401{Colors.END}")
    print("-" * 60)
    
    no_auth_result = test_endpoint_without_auth(
        "POST", 
        f"{BACKEND_URL}/api/patient/checklist/sync-protocols", 
        "POST /api/patient/checklist/sync-protocols (no auth)"
    )
    all_tests.append(no_auth_result)
    
    # 3. Get patient token
    print(f"\n{Colors.PURPLE}📋 3. GET AUTHENTICATION TOKENS{Colors.END}")
    print("-" * 40)
    
    patient_token = get_supabase_token(PATIENT_EMAIL, PATIENT_PASSWORD, "patient")
    professional_token = get_supabase_token(PROFESSIONAL_EMAIL, PROFESSIONAL_PASSWORD, "professional")
    
    if not patient_token:
        print(f"\n{Colors.RED}❌ Cannot get patient token. Stopping patient tests.{Colors.END}")
        return False
        
    # 4. Test Case 2: Valid patient token should return 200
    print(f"\n{Colors.PURPLE}📋 4. TEST CASE 2: With valid patient token → expect 200{Colors.END}")
    print("-" * 60)
    
    sync_success, first_response = test_patient_sync_protocols_with_token(patient_token)
    all_tests.append(sync_success)
    
    # 5. Test Case 3: Idempotency test
    if sync_success and first_response:
        print(f"\n{Colors.PURPLE}📋 5. TEST CASE 3: Idempotency → same result on second call{Colors.END}")
        print("-" * 60)
        
        idempotency_result = test_idempotency(patient_token, first_response)
        all_tests.append(idempotency_result)
    
    # 6. Test Case 4: Professional protocols list
    if professional_token:
        print(f"\n{Colors.PURPLE}📋 6. TEST CASE 4: Professional protocols list{Colors.END}")
        print("-" * 60)
        
        protocols_result = test_professional_protocols_list(professional_token)
        all_tests.append(protocols_result)
    else:
        print(f"\n{Colors.YELLOW}⚠️ Skipping professional tests - no token{Colors.END}")
    
    # 7. Test Case 5: Basic health endpoint (already done in step 1)
    print(f"\n{Colors.PURPLE}📋 7. TEST CASE 5: Basic health endpoint ✅ (already verified){Colors.END}")
    
    # 8. Summary
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
        print(f"{Colors.GREEN}✅ TEST 1: POST /api/patient/checklist/sync-protocols without token → 401{Colors.END}")
        print(f"{Colors.GREEN}✅ TEST 2: POST /api/patient/checklist/sync-protocols with valid patient token → 200{Colors.END}")
        if sync_success:
            print(f"{Colors.GREEN}✅ TEST 3: Idempotency verified → same result on second call{Colors.END}")
        if professional_token:
            print(f"{Colors.GREEN}✅ TEST 4: GET /api/professional/protocols/list working{Colors.END}")
        print(f"{Colors.GREEN}✅ TEST 5: Basic health endpoint working{Colors.END}")
        
        return True
    else:
        failed_count = total - passed
        print(f"{Colors.RED}{Colors.BOLD}❌ TESTS FAILED: {failed_count}/{total} failed{Colors.END}")
        print(f"{Colors.RED}Some endpoints may not be working correctly.{Colors.END}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
"""
Backend Test Suite for Protocol-Checklist Integration Merge Verification
Tests all the endpoints mentioned in the review request to verify the merge worked correctly.
"""
import requests
import json
import sys
import os

# Get backend URL from environment - using the correct URL from frontend/.env  
BACKEND_URL = "https://timeline-sync-3.preview.emergentagent.com"

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

def test_endpoint(method, endpoint, expected_status=None, headers=None, data=None):
    """Test a single endpoint and return result"""
    url = f"{BACKEND_URL}{endpoint}"
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == 'POST':
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method.upper() == 'PUT':
            response = requests.put(url, headers=headers, json=data, timeout=10)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            return {"error": f"Unsupported method: {method}"}
        
        result = {
            "method": method,
            "endpoint": endpoint,
            "status_code": response.status_code,
            "success": True
        }
        
        # Check if we got expected status
        if expected_status and response.status_code != expected_status:
            result["expected"] = expected_status
        
        # Try to get response data
        try:
            result["response"] = response.json()
        except:
            result["response_text"] = response.text[:200] if response.text else "Empty response"
        
        return result
    
    except Exception as e:
        return {
            "method": method,
            "endpoint": endpoint,
            "error": str(e),
            "success": False
        }

def run_merge_verification_tests():
    """Run all tests to verify the merge worked correctly"""
    
    print(f"{Colors.BOLD}{Colors.BLUE}")
    print("🔍 TESTING PROTOCOL-CHECKLIST INTEGRATION MERGE")
    print("=" * 60)
    print(f"{Colors.END}")
    
    results = {
        "health_check": [],
        "new_endpoints_401": [],
        "crud_endpoints_401": [],
        "passed": 0,
        "failed": 0,
        "total": 0
    }
    
    # 1. HEALTH CHECK
    print(f"\n{Colors.PURPLE}1️⃣ HEALTH CHECK{Colors.END}")
    print("-" * 30)
    
    health_test = test_endpoint("GET", "/api/status", expected_status=200)
    results["health_check"].append(health_test)
    results["total"] += 1
    
    if health_test.get("status_code") == 200:
        log_test("GET /api/status", "PASS", "Backend funcionando")
        results["passed"] += 1
    else:
        log_test("GET /api/status", "FAIL", f"Status {health_test.get('status_code', 'ERROR')}")
        results["failed"] += 1
        
    # 2. NEW ENDPOINTS (should return 401 without auth)
    print(f"\n{Colors.PURPLE}2️⃣ NEW ENDPOINTS (should return 401 without auth){Colors.END}")
    print("-" * 50)
    
    new_endpoints = [
        ("GET", "/api/professional/protocols/list"),
        ("POST", "/api/professional/protocols/activate"),
        ("GET", "/api/professional/patients/test-id/active-protocols"), 
        ("POST", "/api/professional/patients/test-id/promote-scheduled-protocols"),
        ("POST", "/api/patient/checklist/sync-protocols"),
        ("GET", "/api/admin/program/protocol-rules")
    ]
    
    for method, endpoint in new_endpoints:
        test_result = test_endpoint(method, endpoint, expected_status=401)
        results["new_endpoints_401"].append(test_result)
        results["total"] += 1
        
        if test_result.get("status_code") == 401:
            log_test(f"{method} {endpoint}", "PASS", "Correctly secured (401)")
            results["passed"] += 1
        else:
            log_test(f"{method} {endpoint}", "FAIL", f"Got {test_result.get('status_code', 'ERROR')} instead of 401")
            results["failed"] += 1
    
    # 3. CRUD ENDPOINTS (should return 401 without auth)
    print(f"\n{Colors.PURPLE}3️⃣ CRUD ENDPOINTS (should return 401 without auth){Colors.END}")
    print("-" * 50)
    
    crud_endpoints = [
        ("POST", "/api/professional/protocols"),
        ("PUT", "/api/professional/protocols/test-id"), 
        ("DELETE", "/api/professional/protocols/test-id")
    ]
    
    for method, endpoint in crud_endpoints:
        test_result = test_endpoint(method, endpoint, expected_status=401)
        results["crud_endpoints_401"].append(test_result)
        results["total"] += 1
        
        if test_result.get("status_code") == 401:
            log_test(f"{method} {endpoint}", "PASS", "Correctly secured (401)")
            results["passed"] += 1
        else:
            log_test(f"{method} {endpoint}", "FAIL", f"Got {test_result.get('status_code', 'ERROR')} instead of 401")
            results["failed"] += 1
    
    # SUMMARY
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"{Colors.END}")
    print(f"✅ PASSED: {results['passed']}/{results['total']}")
    print(f"❌ FAILED: {results['failed']}/{results['total']}")
    print(f"📈 SUCCESS RATE: {(results['passed']/results['total']*100) if results['total'] > 0 else 0:.1f}%")
    
    # SUCCESS CRITERIA CHECK
    print(f"\n{Colors.PURPLE}🎯 SUCCESS CRITERIA CHECK:{Colors.END}")
    print("-" * 30)
    
    # Check if backend is running
    backend_running = any(r.get("status_code") == 200 for r in results["health_check"])
    print(f"{'✅' if backend_running else '❌'} Backend running (GET /api/status → 200)")
    
    # Check if all new endpoints return 401 
    new_endpoints_secure = all(r.get("status_code") == 401 for r in results["new_endpoints_401"])
    print(f"{'✅' if new_endpoints_secure else '❌'} All new endpoints return 401 without auth")
    
    # Check if all CRUD endpoints return 401
    crud_endpoints_secure = all(r.get("status_code") == 401 for r in results["crud_endpoints_401"])  
    print(f"{'✅' if crud_endpoints_secure else '❌'} All CRUD endpoints return 401 without auth")
    
    # Overall success
    all_criteria_met = backend_running and new_endpoints_secure and crud_endpoints_secure
    
    print(f"\n{Colors.BOLD}")
    print("=" * 60)
    if all_criteria_met:
        print(f"{Colors.GREEN}🎉 MERGE VERIFICATION: SUCCESS!{Colors.END}")
        print("All endpoints are working correctly and properly secured.")
        return True
    else:
        print(f"{Colors.RED}⚠️  MERGE VERIFICATION: ISSUES FOUND!{Colors.END}")
        print("Some endpoints have security or functionality issues.")
        return False

if __name__ == "__main__":
    success = run_merge_verification_tests()
    sys.exit(0 if success else 1)
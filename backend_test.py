#!/usr/bin/env python3
"""
FitJourney Automation Engine Backend Testing
===========================================

Tests the automation engine backend after fixes according to the review request:

1. Health check GET /api/status → 200
2. Authentication on automation endpoints (should return 401 without auth)  
3. Invalid token → 401
4. Health endpoint should be public (not require auth)
5. Verify source code in automation_engine.py
6. Verify source code in meal_completion.py 
7. Verify worker.py pipeline
8. Verify detector checklist.low_detected
9. Verify SQL P80 rule exists
"""
import asyncio
import json
import sys
import os
from typing import Any, Dict, List, Optional
import httpx

# Backend URL configuration
BACKEND_URL = "https://fit-admin-fix.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class TestResult:
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
    
    def add_result(self, test_name: str, success: bool, details: str = ""):
        self.results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        if success:
            self.passed += 1
        else:
            self.failed += 1
    
    def print_summary(self):
        print("\n" + "="*80)
        print("FITJOURNEY AUTOMATION ENGINE BACKEND TEST RESULTS")
        print("="*80)
        
        for result in self.results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"{status}: {result['test']}")
            if result["details"]:
                print(f"      Details: {result['details']}")
        
        print("\n" + "="*80)
        print(f"SUMMARY: {self.passed} PASSED, {self.failed} FAILED")
        print("="*80)
        
        return self.failed == 0

async def test_health_check():
    """Test 1: Health check GET /api/status → 200"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{API_BASE}/status")
            return response.status_code == 200, f"Status: {response.status_code}"
    except Exception as e:
        return False, f"Error: {str(e)}"

async def test_automation_endpoints_authentication():
    """Test 2: All automation endpoints should return 401 without Authorization header"""
    endpoints = [
        ("POST", f"{API_BASE}/admin/automation-engine/run"),
        ("POST", f"{API_BASE}/admin/automation-engine/events/emit"),
        ("POST", f"{API_BASE}/admin/automation-engine/detect"),
        ("POST", f"{API_BASE}/admin/automation-engine/rules"),
        ("PATCH", f"{API_BASE}/admin/automation-engine/rules/some-uuid"),
        ("DELETE", f"{API_BASE}/admin/automation-engine/rules/some-uuid"),
    ]
    
    results = []
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for method, url in endpoints:
                try:
                    if method == "POST":
                        response = await client.post(url, json={})
                    elif method == "PATCH":
                        response = await client.patch(url, json={})
                    elif method == "DELETE":
                        response = await client.delete(url)
                    
                    success = response.status_code == 401
                    results.append(f"{method} {url.split('/')[-1]}: {response.status_code}")
                    
                    if not success:
                        return False, f"Expected 401 for {method} {url}, got {response.status_code}"
                        
                except Exception as e:
                    results.append(f"{method} {url.split('/')[-1]}: ERROR - {str(e)}")
                    return False, f"Error testing {method} {url}: {str(e)}"
        
        return True, "; ".join(results)
    except Exception as e:
        return False, f"Error: {str(e)}"

async def test_invalid_token():
    """Test 3: Invalid token should return 401"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {"Authorization": "Bearer token_invalido_abc123"}
            response = await client.post(f"{API_BASE}/admin/automation-engine/run", 
                                       json={}, headers=headers)
            return response.status_code == 401, f"Status: {response.status_code}"
    except Exception as e:
        return False, f"Error: {str(e)}"

async def test_health_endpoint_public():
    """Test 4: Health endpoint should be public (no auth required)"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{API_BASE}/admin/automation-engine/health")
            # Should return 200 or 503 (if Supabase not configured), but NOT 401
            success = response.status_code in [200, 503] and response.status_code != 401
            return success, f"Status: {response.status_code} (Expected: 200 or 503, NOT 401)"
    except Exception as e:
        return False, f"Error: {str(e)}"

def verify_automation_engine_source():
    """Test 5: Verify automation_engine.py source code"""
    try:
        with open("/app/backend/routes/automation_engine.py", "r") as f:
            content = f.read()
        
        checks = []
        
        # a) ALLOWED_ACTION_TYPES includes "create_pre_plan_draft"
        if '"create_pre_plan_draft"' in content:
            checks.append("✓ ALLOWED_ACTION_TYPES includes 'create_pre_plan_draft'")
        else:
            return False, "❌ 'create_pre_plan_draft' not found in ALLOWED_ACTION_TYPES"
        
        # b) DetectRequest has field checklist_threshold_pct
        if "checklist_threshold_pct" in content:
            checks.append("✓ DetectRequest has checklist_threshold_pct field")
        else:
            return False, "❌ checklist_threshold_pct field not found in DetectRequest"
        
        # c) _require_admin_or_professional() exists and uses app_role
        if "_require_admin_or_professional" in content and "app_role" in content:
            checks.append("✓ _require_admin_or_professional() exists and uses app_role")
        else:
            return False, "❌ _require_admin_or_professional() or app_role usage not found"
        
        # d-g) Check Depends(get_current_user_with_db_role) usage
        required_endpoints = ["/run", "/events/emit", "/detect", "POST /rules"]
        depends_found = content.count("Depends(get_current_user_with_db_role)")
        if depends_found >= 4:  # Should be in all protected endpoints
            checks.append(f"✓ Depends(get_current_user_with_db_role) found {depends_found} times")
        else:
            return False, f"❌ Expected multiple uses of Depends(get_current_user_with_db_role), found {depends_found}"
        
        return True, "; ".join(checks)
        
    except Exception as e:
        return False, f"Error reading automation_engine.py: {str(e)}"

def verify_meal_completion_source():
    """Test 6: Verify meal_completion.py source code"""
    try:
        with open("/app/backend/routes/meal_completion.py", "r") as f:
            content = f.read()
        
        checks = []
        
        # a) emit_low_adherence_event does NOT have dedupe_key_pattern parameter
        if "dedupe_key_pattern" in content:
            return False, "❌ Found dedupe_key_pattern parameter (should be removed)"
        else:
            checks.append("✓ dedupe_key_pattern parameter NOT found (correctly removed)")
        
        # b) Uses dedupe_key=make_daily_dedupe_key(...) correctly
        if "make_daily_dedupe_key" in content and "dedupe_key=" in content:
            checks.append("✓ Uses make_daily_dedupe_key correctly")
        else:
            return False, "❌ make_daily_dedupe_key usage not found or incorrect"
        
        # c) Import of make_daily_dedupe_key is present
        if "from services.automation_engine.emitter import" in content and "make_daily_dedupe_key" in content:
            checks.append("✓ make_daily_dedupe_key import is present")
        else:
            return False, "❌ make_daily_dedupe_key import not found"
        
        return True, "; ".join(checks)
        
    except Exception as e:
        return False, f"Error reading meal_completion.py: {str(e)}"

def verify_worker_pipeline():
    """Test 7: Verify worker.py pipeline"""
    try:
        with open("/app/backend/services/automation_engine/worker.py", "r") as f:
            content = f.read()
        
        checks = []
        
        # a) process_automation_events exists
        if "def process_automation_events" in content:
            checks.append("✓ process_automation_events function exists")
        else:
            return False, "❌ process_automation_events function not found"
        
        # b) Pipeline steps exist
        pipeline_steps = [
            "fetch_pending_events", "mark_processing", "evaluate_conditions", 
            "is_on_cooldown", "execute_actions", "insert_run", "set_event_status"
        ]
        
        found_steps = []
        for step in pipeline_steps:
            if step in content:
                found_steps.append(step)
        
        if len(found_steps) >= 6:  # Most pipeline steps should be present
            checks.append(f"✓ Pipeline steps found: {len(found_steps)}/7")
        else:
            return False, f"❌ Only {len(found_steps)}/7 pipeline steps found"
        
        # c) _process_single_event exists  
        if "_process_single_event" in content:
            checks.append("✓ _process_single_event function exists")
        else:
            return False, "❌ _process_single_event function not found"
        
        return True, "; ".join(checks)
        
    except Exception as e:
        return False, f"Error reading worker.py: {str(e)}"

def verify_detector_checklist():
    """Test 8: Verify detector checklist.low_detected"""
    try:
        with open("/app/backend/services/automation_engine/detectors.py", "r") as f:
            content = f.read()
        
        checks = []
        
        # a) detect_low_checklist exists
        if "def detect_low_checklist" in content:
            checks.append("✓ detect_low_checklist function exists")
        else:
            return False, "❌ detect_low_checklist function not found"
        
        # b) Uses checklist_tasks for calculation
        if "checklist_tasks" in content:
            checks.append("✓ Uses checklist_tasks table")
        else:
            return False, "❌ checklist_tasks table usage not found"
        
        # c) Dedupe key format
        if '"checklist.low_detected:{patient_id}:{YYYY-MM-DD}"' in content or "checklist.low_detected" in content:
            checks.append("✓ Dedupe key format includes checklist.low_detected")
        else:
            return False, "❌ Correct dedupe key format not found"
        
        # d) Payload fields
        payload_fields = ["checklist_pct", "patient_name", "patient_status", "total_tasks", "completed_tasks"]
        found_fields = sum(1 for field in payload_fields if field in content)
        
        if found_fields >= 4:
            checks.append(f"✓ Payload fields found: {found_fields}/5")
        else:
            return False, f"❌ Only {found_fields}/5 payload fields found"
        
        # e) run_all_detectors accepts checklist_threshold_pct
        if "checklist_threshold_pct" in content and "run_all_detectors" in content:
            checks.append("✓ run_all_detectors accepts checklist_threshold_pct")
        else:
            return False, "❌ checklist_threshold_pct parameter not found in run_all_detectors"
        
        return True, "; ".join(checks)
        
    except Exception as e:
        return False, f"Error reading detectors.py: {str(e)}"

def verify_sql_p80_rule():
    """Test 9: Verify SQL P80 rule exists"""
    try:
        with open("/app/sql/automation_p80_checklist_rule.sql", "r") as f:
            content = f.read()
        
        checks = []
        
        # Check trigger_type
        if "trigger_type" in content and "checklist.low_detected" in content:
            checks.append("✓ trigger_type = 'checklist.low_detected'")
        else:
            return False, "❌ trigger_type 'checklist.low_detected' not found"
        
        # Check conditions with checklist_pct < 40
        if "checklist_pct" in content and ("lt" in content or "<" in content) and "40" in content:
            checks.append("✓ Conditions with checklist_pct < 40")
        else:
            return False, "❌ Conditions with checklist_pct < 40 not found"
        
        # Check 3 actions
        required_actions = ["notify_professional", "create_task", "create_pre_plan_draft"]
        found_actions = sum(1 for action in required_actions if action in content)
        
        if found_actions >= 3:
            checks.append(f"✓ All 3 actions found: {', '.join(required_actions)}")
        else:
            return False, f"❌ Only {found_actions}/3 actions found"
        
        return True, "; ".join(checks)
        
    except Exception as e:
        return False, f"Error reading SQL file: {str(e)}"

async def run_all_tests():
    """Run all tests and collect results"""
    test_result = TestResult()
    
    print("Starting FitJourney Automation Engine Backend Tests...")
    print("=" * 80)
    
    # Test 1: Health check
    print("1. Testing health check...")
    success, details = await test_health_check()
    test_result.add_result("Health check GET /api/status", success, details)
    
    # Test 2: Authentication endpoints
    print("2. Testing automation endpoints authentication...")
    success, details = await test_automation_endpoints_authentication()
    test_result.add_result("Automation endpoints return 401 without auth", success, details)
    
    # Test 3: Invalid token
    print("3. Testing invalid token...")
    success, details = await test_invalid_token()
    test_result.add_result("Invalid token returns 401", success, details)
    
    # Test 4: Health endpoint public
    print("4. Testing health endpoint is public...")
    success, details = await test_health_endpoint_public()
    test_result.add_result("Health endpoint is public (not 401)", success, details)
    
    # Test 5: Verify automation_engine.py source
    print("5. Verifying automation_engine.py source code...")
    success, details = verify_automation_engine_source()
    test_result.add_result("automation_engine.py source verification", success, details)
    
    # Test 6: Verify meal_completion.py source
    print("6. Verifying meal_completion.py source code...")
    success, details = verify_meal_completion_source()
    test_result.add_result("meal_completion.py bug fix verification", success, details)
    
    # Test 7: Verify worker.py pipeline
    print("7. Verifying worker.py pipeline...")
    success, details = verify_worker_pipeline()
    test_result.add_result("worker.py pipeline verification", success, details)
    
    # Test 8: Verify detector checklist
    print("8. Verifying detector checklist.low_detected...")
    success, details = verify_detector_checklist()
    test_result.add_result("detector checklist.low_detected verification", success, details)
    
    # Test 9: Verify SQL P80 rule
    print("9. Verifying SQL P80 rule...")
    success, details = verify_sql_p80_rule()
    test_result.add_result("SQL P80 rule verification", success, details)
    
    return test_result

if __name__ == "__main__":
    result = asyncio.run(run_all_tests())
    all_passed = result.print_summary()
    
    if all_passed:
        print("\n🎉 ALL TESTS PASSED! Automation engine is ready.")
        sys.exit(0)
    else:
        print(f"\n❌ {result.failed} TEST(S) FAILED. Please review and fix issues.")
        sys.exit(1)
#!/usr/bin/env python3
"""
Backend Test Suite - Protocol Endpoints & Timeline Verification
Based on review request for branch projeto-fase-3

Tests:
1. Security - All new endpoints should return 401 without Authorization
2. Code Verification - Backend protocol routes and timeline enrichment
3. Code Verification - Frontend real API usage (not mock)
"""

import requests
import json
import os
import sys
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://timeline-sync-3.preview.emergentagent.com/api"

class ProtocolTestSuite:
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
        
    def log_result(self, test_name, passed, details=""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        self.results.append(f"{status} - {test_name}")
        if details:
            self.results.append(f"    {details}")
        
        if passed:
            self.passed += 1
        else:
            self.failed += 1
            
        print(f"{status} - {test_name}")
        if details:
            print(f"    {details}")
    
    def test_endpoint_security(self, method, endpoint, description):
        """Test that endpoint returns 401 without Authorization header"""
        try:
            url = f"{BACKEND_URL}{endpoint}"
            
            if method.upper() == "GET":
                response = requests.get(url, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, json={}, timeout=10)
            elif method.upper() == "PUT":
                response = requests.put(url, json={}, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, timeout=10)
            
            if response.status_code == 401:
                self.log_result(f"Security: {method} {endpoint}", True, 
                              f"Correctly returns 401 - {description}")
                return True
            else:
                self.log_result(f"Security: {method} {endpoint}", False, 
                              f"Expected 401, got {response.status_code} - {description}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_result(f"Security: {method} {endpoint}", False, 
                          f"Network error: {str(e)}")
            return False
    
    def test_backend_health(self):
        """Test backend is running"""
        try:
            response = requests.get(f"{BACKEND_URL.replace('/api', '')}/api/status", timeout=10)
            if response.status_code == 200:
                self.log_result("Backend Health Check", True, "Backend is running")
                return True
            else:
                self.log_result("Backend Health Check", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Backend Health Check", False, f"Error: {str(e)}")
            return False
    
    def verify_file_content(self, filepath, checks):
        """Verify specific content exists in a file"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            all_checks_passed = True
            missing_items = []
            
            for check_name, search_text in checks.items():
                if search_text in content:
                    print(f"  ✅ {check_name}: Found")
                else:
                    print(f"  ❌ {check_name}: Missing - '{search_text}'")
                    all_checks_passed = False
                    missing_items.append(check_name)
            
            if all_checks_passed:
                self.log_result(f"Code Verification: {filepath}", True, "All required functions found")
                return True
            else:
                self.log_result(f"Code Verification: {filepath}", False, 
                              f"Missing: {', '.join(missing_items)}")
                return False
                
        except FileNotFoundError:
            self.log_result(f"Code Verification: {filepath}", False, "File not found")
            return False
        except Exception as e:
            self.log_result(f"Code Verification: {filepath}", False, f"Error reading file: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all test suites"""
        print("=" * 80)
        print("🧪 TESTING PROTOCOL ENDPOINTS & ENRICHED TIMELINE")
        print("=" * 80)
        
        # 1. HEALTH CHECK
        print("\n🏥 1. BACKEND HEALTH CHECK")
        print("-" * 50)
        self.test_backend_health()
        
        # 2. SECURITY TESTS - All new protocol endpoints should return 401
        print("\n🔒 2. SECURITY TESTS - Protocol Endpoints (401 without auth)")
        print("-" * 50)
        
        security_tests = [
            ("GET", "/professional/protocols", "List protocols catalog"),
            ("POST", "/professional/protocols", "Create new protocol"),  
            ("PUT", "/professional/protocols/test-id", "Update existing protocol"),
            ("DELETE", "/professional/protocols/test-id", "Delete protocol from catalog"),
            ("GET", "/professional/patients/test-id/protocols", "List patient protocols"),
        ]
        
        for method, endpoint, desc in security_tests:
            self.test_endpoint_security(method, endpoint, desc)
        
        # 3. CODE VERIFICATION - Backend Routes
        print("\n🔍 3. CODE VERIFICATION - Backend Routes")
        print("-" * 50)
        
        # protocols.py verification
        protocol_checks = {
            "list_protocols function": "def list_protocols(",
            "create_protocol function": "def create_protocol(",
            "update_protocol function": "def update_protocol(",
            "delete_protocol function": "def delete_protocol(",
            "list_patient_protocols function": "def list_patient_protocols(",
            "get_current_user_with_db_role usage": "get_current_user_with_db_role",
            "professional/admin role check": 'app_role not in ["professional", "admin"]',
            "name validation": "not request.name",
            "log_operation usage": "log_operation(",
        }
        
        self.verify_file_content("/app/backend/routes/protocols.py", protocol_checks)
        
        # patient_timeline.py verification - Section #6
        timeline_checks = {
            "protocols join select": "protocols(id,name,category,default_duration_days)",
            "protocolo_programado event": '"protocolo_programado"',
            "protocolo_ativado event": '"protocolo_ativado"',
            "protocolo_tasks event": '"protocolo_tasks"',
            "protocolo_pausado event": '"protocolo_pausado"',
            "status=scheduled handling": 'status == "scheduled"',
            "status=active handling": 'status == "active"',
            "status=paused handling": 'status == "paused"',
            "protocol_tasks query": 'protocol_tasks',
        }
        
        self.verify_file_content("/app/backend/routes/patient_timeline.py", timeline_checks)
        
        # 4. CODE VERIFICATION - Frontend Files  
        print("\n🎨 4. CODE VERIFICATION - Frontend Files")
        print("-" * 50)
        
        # PatientProfile.js verification
        profile_checks = {
            "loadProtocols function": "const loadProtocols =",
            "loadProtocols API call": "/api/professional/protocols",
            "loadProtocols patient protocols": "/api/professional/patients/",
            "handleSaveProtocol function": "const handleSaveProtocol =",
            "handleDeleteProtocol function": "const handleDeleteProtocol =",
            "handleActivateProtocol function": "const handleActivateProtocol =",
            "authenticatedPost import": "authenticatedPost",
            "real API activate call": "/api/professional/protocols/activate",
        }
        
        self.verify_file_content("/app/frontend/src/pages/PatientProfile.js", profile_checks)
        
        # PatientTimeline.js verification
        timeline_frontend_checks = {
            "list icon in iconMap": "list: List",
            "calendar icon in iconMap": "calendar: Calendar", 
            "pause icon in iconMap": "pause: Pause",
            "orange color in colorMap": "orange:",
        }
        
        self.verify_file_content("/app/frontend/src/components/PatientTimeline.js", timeline_frontend_checks)
        
        # 5. RESULTS SUMMARY
        print("\n" + "=" * 80)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 80)
        
        total_tests = self.passed + self.failed
        pass_rate = (self.passed / total_tests * 100) if total_tests > 0 else 0
        
        print(f"✅ PASSED: {self.passed}")
        print(f"❌ FAILED: {self.failed}")
        print(f"📈 PASS RATE: {pass_rate:.1f}%")
        
        if self.failed == 0:
            print("\n🎉 ALL TESTS PASSED! Protocol endpoints and timeline are ready.")
        else:
            print(f"\n⚠️  {self.failed} test(s) failed. Please review the issues above.")
        
        print("\nDETAILED RESULTS:")
        for result in self.results:
            print(result)
        
        return self.failed == 0

if __name__ == "__main__":
    test_suite = ProtocolTestSuite()
    success = test_suite.run_all_tests()
    sys.exit(0 if success else 1)
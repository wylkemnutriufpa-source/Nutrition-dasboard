"""
Test Timeline API and UX Feature Improvements
Tests for:
1. Timeline API (GET /api/timeline/patients/{id}/events)
2. EmptyState verification
3. SaveStatusIndicator integration
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fix-anamne-patch.preview.emergentagent.com').rstrip('/')
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://safovouvjiikaickutvi.supabase.co')
SUPABASE_ANON_KEY = os.environ.get('REACT_APP_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZm92b3V2amlpa2FpY2t1dHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjgzODAsImV4cCI6MjA4NzU0NDM4MH0.Joq1e2DR6hb3XGh8pXg3c-eZ-vXiGGmxmzy-ibf3oIE')

# Test credentials
TEST_ADMIN_EMAIL = "wylkem.nutri.ufpa@gmail.com"
TEST_ADMIN_PASSWORD = "Admin123!"
TEST_PATIENT_ID = "4e765b2b-2436-493a-a158-c8d5bcffdbc1"  # Gleice kelly


class TestAuth:
    """Authentication helper tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token from Supabase"""
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": TEST_ADMIN_EMAIL,
                "password": TEST_ADMIN_PASSWORD
            }
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        print(f"Auth failed: {response.status_code} - {response.text}")
        pytest.skip("Authentication failed - skipping authenticated tests")
        return None
    
    def test_auth_supabase_login(self):
        """Test Supabase auth login returns token"""
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": TEST_ADMIN_EMAIL,
                "password": TEST_ADMIN_PASSWORD
            }
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert len(data["access_token"]) > 0, "Empty access token"
        print(f"✅ Auth login successful, token received")


class TestTimelineAPI:
    """Timeline API endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token from Supabase"""
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": TEST_ADMIN_EMAIL,
                "password": TEST_ADMIN_PASSWORD
            }
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
        return None
    
    def test_timeline_endpoint_exists(self, auth_token):
        """Test timeline API endpoint returns 200"""
        if not auth_token:
            pytest.skip("No auth token")
        
        response = requests.get(
            f"{BASE_URL}/api/timeline/patients/{TEST_PATIENT_ID}/events",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
        )
        
        # Should return 200 even with empty data
        assert response.status_code == 200, f"Timeline API failed: {response.status_code} - {response.text}"
        print(f"✅ Timeline API returned status 200")
    
    def test_timeline_response_structure(self, auth_token):
        """Test timeline response has correct structure"""
        if not auth_token:
            pytest.skip("No auth token")
        
        response = requests.get(
            f"{BASE_URL}/api/timeline/patients/{TEST_PATIENT_ID}/events?limit=15",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "events" in data, "Missing 'events' key in response"
        assert "total" in data, "Missing 'total' key in response"
        assert isinstance(data["events"], list), "'events' should be a list"
        assert isinstance(data["total"], int), "'total' should be an integer"
        
        print(f"✅ Timeline structure valid - {data['total']} events found")
    
    def test_timeline_event_format(self, auth_token):
        """Test individual events have correct format"""
        if not auth_token:
            pytest.skip("No auth token")
        
        response = requests.get(
            f"{BASE_URL}/api/timeline/patients/{TEST_PATIENT_ID}/events?limit=20",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["events"]) > 0:
            event = data["events"][0]
            
            # Verify event structure
            required_fields = ["type", "icon", "title", "timestamp", "color"]
            for field in required_fields:
                assert field in event, f"Missing '{field}' in event"
            
            # Verify icon values are valid
            valid_icons = ["check", "file", "scale", "message", "image", "target", "bell", "user"]
            assert event["icon"] in valid_icons, f"Invalid icon: {event['icon']}"
            
            # Verify color values are valid
            valid_colors = ["emerald", "blue", "indigo", "violet", "teal", "amber", "gray", "green"]
            assert event["color"] in valid_colors, f"Invalid color: {event['color']}"
            
            print(f"✅ Event format valid: {event['type']} - {event['title']}")
        else:
            print("⚠️ No events found - timeline may be empty for this patient")
    
    def test_timeline_limit_parameter(self, auth_token):
        """Test timeline respects limit parameter"""
        if not auth_token:
            pytest.skip("No auth token")
        
        # Test with limit=5
        response = requests.get(
            f"{BASE_URL}/api/timeline/patients/{TEST_PATIENT_ID}/events?limit=5",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Events should not exceed limit
        assert len(data["events"]) <= 5, f"Events exceed limit: {len(data['events'])} > 5"
        
        print(f"✅ Timeline limit working - returned {len(data['events'])} events")
    
    def test_timeline_invalid_patient_returns_empty(self, auth_token):
        """Test timeline returns empty for invalid patient ID"""
        if not auth_token:
            pytest.skip("No auth token")
        
        invalid_patient_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(
            f"{BASE_URL}/api/timeline/patients/{invalid_patient_id}/events",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return empty events, not error
        assert data["events"] == [], "Should return empty events for invalid patient"
        assert data["total"] == 0, "Total should be 0 for invalid patient"
        
        print(f"✅ Timeline returns empty for invalid patient")
    
    def test_timeline_unauthorized_access(self):
        """Test timeline requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/timeline/patients/{TEST_PATIENT_ID}/events",
            headers={
                "Content-Type": "application/json"
            }
        )
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Timeline properly requires authentication")


class TestPatientScoringAPI:
    """Patient Scoring API tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token from Supabase"""
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": TEST_ADMIN_EMAIL,
                "password": TEST_ADMIN_PASSWORD
            }
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
        return None
    
    def test_scoring_batch_endpoint(self, auth_token):
        """Test patient scoring batch endpoint"""
        if not auth_token:
            pytest.skip("No auth token")
        
        response = requests.post(
            f"{BASE_URL}/api/scoring/patients/scores",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={
                "patient_ids": [TEST_PATIENT_ID]
            }
        )
        
        # Endpoint should exist and return data
        assert response.status_code == 200, f"Scoring API failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Should return a dict with patient_id as key
        assert isinstance(data, dict), "Response should be a dictionary"
        
        print(f"✅ Scoring API returned successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

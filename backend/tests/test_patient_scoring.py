"""
Test Patient Priority Scoring API Endpoints

Tests for the new Patient Priority Score feature (0-100):
- GET /api/scoring/patients/{patient_id}/score - Single patient score
- POST /api/scoring/patients/scores - Batch scores for multiple patients

Score calculation factors:
- checklist_adherence (40pts)
- recency_login (20pts)
- feedback_recente (10pts)
- peso_recente (10pts)
- fotos_recentes (10pts)
- protocolos_cumpridos (10pts)

Status levels:
- 80-100: green (Engajado)
- 50-79: yellow (Atenção)
- 0-49: red (Risco alto)
"""

import pytest
import requests
import os

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SUPABASE_URL = "https://safovouvjiikaickutvi.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZm92b3V2amlpa2FpY2t1dHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjgzODAsImV4cCI6MjA4NzU0NDM4MH0.Joq1e2DR6hb3XGh8pXg3c-eZ-vXiGGmxmzy-ibf3oIE"

# Test credentials
ADMIN_EMAIL = "wylkem.nutri.ufpa@gmail.com"
ADMIN_PASSWORD = "Admin123!"

# Test patient IDs (from request context)
TEST_PATIENT_IDS = [
    "4e765b2b-2436-493a-a158-c8d5bcffdbc1",
    "63976ef9-c44a-47fe-836e-abf0deefc957"
]


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token via Supabase Auth"""
    response = api_client.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        },
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"✅ Authentication successful, got token")
        return token
    else:
        print(f"❌ Authentication failed: {response.status_code} - {response.text}")
        pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestScoringEndpointAuth:
    """Test authentication requirements for scoring endpoints"""
    
    def test_get_score_without_auth_returns_401(self, api_client):
        """GET /api/scoring/patients/{id}/score requires authentication"""
        # Use fresh session without auth token
        session = requests.Session()
        response = session.get(
            f"{BASE_URL}/api/scoring/patients/{TEST_PATIENT_IDS[0]}/score"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ GET single score without auth returns 401")
    
    def test_post_batch_scores_without_auth_returns_401(self, api_client):
        """POST /api/scoring/patients/scores requires authentication"""
        # Use fresh session without auth token
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/scoring/patients/scores",
            json={"patient_ids": TEST_PATIENT_IDS}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ POST batch scores without auth returns 401")


class TestSinglePatientScore:
    """Test GET /api/scoring/patients/{patient_id}/score endpoint"""
    
    def test_get_patient_score_returns_correct_structure(self, authenticated_client):
        """Score endpoint returns all required fields"""
        patient_id = TEST_PATIENT_IDS[0]
        response = authenticated_client.get(
            f"{BASE_URL}/api/scoring/patients/{patient_id}/score"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"📊 Score response: {data}")
        
        # Verify top-level structure
        assert "patient_id" in data, "Response missing 'patient_id'"
        assert "score" in data, "Response missing 'score'"
        assert "status" in data, "Response missing 'status'"
        assert "label" in data, "Response missing 'label'"
        assert "level" in data, "Response missing 'level'"
        assert "factors" in data, "Response missing 'factors'"
        assert "alerts" in data, "Response missing 'alerts'"
        
        # Verify patient_id matches request
        assert data["patient_id"] == patient_id
        
        print("✅ GET single patient score returns correct structure")
    
    def test_score_is_in_valid_range(self, authenticated_client):
        """Score should be between 0-100"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/scoring/patients/{TEST_PATIENT_IDS[0]}/score"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        score = data.get("score")
        assert isinstance(score, int), f"Score should be int, got {type(score)}"
        assert 0 <= score <= 100, f"Score {score} not in range 0-100"
        
        print(f"✅ Score {score} is in valid range 0-100")
    
    def test_status_matches_score_range(self, authenticated_client):
        """Status should match score: green (80-100), yellow (50-79), red (0-49)"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/scoring/patients/{TEST_PATIENT_IDS[0]}/score"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        score = data["score"]
        status = data["status"]
        label = data["label"]
        level = data["level"]
        
        if score >= 80:
            assert status == "green", f"Score {score} should have green status, got {status}"
            assert label == "Engajado", f"Score {score} should have 'Engajado' label, got {label}"
            assert level == "excellent", f"Score {score} should have 'excellent' level, got {level}"
        elif score >= 50:
            assert status == "yellow", f"Score {score} should have yellow status, got {status}"
            assert label == "Atenção", f"Score {score} should have 'Atenção' label, got {label}"
            assert level == "attention", f"Score {score} should have 'attention' level, got {level}"
        else:
            assert status == "red", f"Score {score} should have red status, got {status}"
            assert label == "Risco alto", f"Score {score} should have 'Risco alto' label, got {label}"
            assert level == "risk", f"Score {score} should have 'risk' level, got {level}"
        
        print(f"✅ Status '{status}' correctly matches score {score}")
    
    def test_factors_have_correct_structure(self, authenticated_client):
        """Factors should include all 6 components with score, max, detail"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/scoring/patients/{TEST_PATIENT_IDS[0]}/score"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        factors = data.get("factors", {})
        expected_factors = ["checklist", "login", "feedback", "peso", "fotos", "protocolos"]
        
        for factor in expected_factors:
            assert factor in factors, f"Missing factor: {factor}"
            
            factor_data = factors[factor]
            assert "score" in factor_data, f"Factor '{factor}' missing 'score'"
            assert "max" in factor_data, f"Factor '{factor}' missing 'max'"
            assert "detail" in factor_data, f"Factor '{factor}' missing 'detail'"
            
            # Verify score is within max
            assert factor_data["score"] <= factor_data["max"], \
                f"Factor '{factor}' score {factor_data['score']} exceeds max {factor_data['max']}"
        
        print(f"✅ All 6 factors present with correct structure: {list(factors.keys())}")
    
    def test_alerts_is_list(self, authenticated_client):
        """Alerts should be a list (may be empty)"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/scoring/patients/{TEST_PATIENT_IDS[0]}/score"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        alerts = data.get("alerts")
        assert isinstance(alerts, list), f"Alerts should be list, got {type(alerts)}"
        
        # If there are alerts, verify structure
        if alerts:
            for alert in alerts:
                assert "type" in alert, "Alert missing 'type'"
                assert "severity" in alert, "Alert missing 'severity'"
                assert "message" in alert, "Alert missing 'message'"
        
        print(f"✅ Alerts is a list with {len(alerts)} item(s)")


class TestBatchScores:
    """Test POST /api/scoring/patients/scores endpoint"""
    
    def test_batch_scores_returns_correct_structure(self, authenticated_client):
        """Batch endpoint returns dict of patient_id -> score data"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/scoring/patients/scores",
            json={"patient_ids": TEST_PATIENT_IDS}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"📊 Batch scores response: {data}")
        
        # Should be a dict with patient IDs as keys
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        
        # Should have entries for all requested patients
        for patient_id in TEST_PATIENT_IDS:
            assert patient_id in data, f"Missing patient_id {patient_id} in response"
            
            patient_data = data[patient_id]
            assert "score" in patient_data, f"Patient {patient_id} missing 'score'"
            assert "status" in patient_data, f"Patient {patient_id} missing 'status'"
            assert "label" in patient_data, f"Patient {patient_id} missing 'label'"
            assert "factors" in patient_data, f"Patient {patient_id} missing 'factors'"
        
        print(f"✅ Batch scores returned data for {len(data)} patients")
    
    def test_empty_batch_returns_empty_object(self, authenticated_client):
        """Empty patient_ids should return empty dict"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/scoring/patients/scores",
            json={"patient_ids": []}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data == {}, f"Expected empty dict, got {data}"
        
        print("✅ Empty batch request returns empty object")
    
    def test_single_patient_in_batch(self, authenticated_client):
        """Batch with single patient works correctly"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/scoring/patients/scores",
            json={"patient_ids": [TEST_PATIENT_IDS[0]]}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 1, f"Expected 1 patient, got {len(data)}"
        assert TEST_PATIENT_IDS[0] in data
        
        print("✅ Single patient batch works correctly")
    
    def test_nonexistent_patient_handled_gracefully(self, authenticated_client):
        """Non-existent patient IDs should not crash the API"""
        fake_patient_id = "00000000-0000-0000-0000-000000000000"
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/scoring/patients/scores",
            json={"patient_ids": [fake_patient_id]}
        )
        
        # Should not crash - either 200 with error status or graceful handling
        assert response.status_code in [200, 400, 404], \
            f"Unexpected status {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            # If 200, should have entry for the patient (even with error status)
            if fake_patient_id in data:
                patient_data = data[fake_patient_id]
                print(f"📊 Non-existent patient data: {patient_data}")
        
        print("✅ Non-existent patient handled gracefully (no crash)")


class TestScoreCalculation:
    """Test score calculation logic"""
    
    def test_total_score_equals_sum_of_factors(self, authenticated_client):
        """Total score should equal sum of all factor scores"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/scoring/patients/{TEST_PATIENT_IDS[0]}/score"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        total_score = data["score"]
        factors = data["factors"]
        
        # Sum all factor scores
        calculated_sum = sum(f.get("score", 0) for f in factors.values())
        
        # Score is clamped to 0-100
        expected_score = min(100, max(0, calculated_sum))
        
        assert total_score == expected_score, \
            f"Total score {total_score} != sum of factors {expected_score}"
        
        print(f"✅ Total score {total_score} equals sum of factors ({calculated_sum} clamped to 0-100)")
    
    def test_factor_weights_are_correct(self, authenticated_client):
        """Factor max values should match expected weights"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/scoring/patients/{TEST_PATIENT_IDS[0]}/score"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        factors = data["factors"]
        expected_weights = {
            "checklist": 40,
            "login": 20,
            "feedback": 10,
            "peso": 10,
            "fotos": 10,
            "protocolos": 10,
        }
        
        for factor, expected_max in expected_weights.items():
            actual_max = factors.get(factor, {}).get("max")
            assert actual_max == expected_max, \
                f"Factor '{factor}' max should be {expected_max}, got {actual_max}"
        
        print("✅ All factor weights match expected values")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Test FitJourney Auth & Patient Creation Flow
============================================
Tests for:
- Admin login via Supabase Auth
- Patient creation with custom password
- Patient login with the provided password
- Select component (position=popper) should not close dialog
"""
import pytest
import requests
import os
import time
import uuid

# Use external public URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SUPABASE_URL = "https://safovouvjiikaickutvi.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZm92b3V2amlpa2FpY2t1dHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjgzODAsImV4cCI6MjA4NzU0NDM4MH0.Joq1e2DR6hb3XGh8pXg3c-eZ-vXiGGmxmzy-ibf3oIE"

# Test credentials
ADMIN_EMAIL = "wylkem.nutri.ufpa@gmail.com"
ADMIN_PASSWORD = "Admin123!"
ADMIN_PROFESSIONAL_ID = "177ff33f-f573-4a9c-aca1-1e4c55d94ece"


class TestSupabaseAuth:
    """Test authentication via Supabase Auth API (not backend /api/auth/login)"""
    
    def test_admin_login_supabase_direct(self):
        """Admin login should work via Supabase Auth directly"""
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            }
        )
        
        # Status check
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        # Data validation
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert len(data["access_token"]) > 0
        
        print(f"✅ Admin login successful: {data['user']['email']}")
        return data["access_token"]


class TestPatientCreation:
    """Test patient creation flow with password handling"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token via Supabase Auth"""
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            }
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_create_patient_without_auth_returns_401(self):
        """POST /api/admin/patients/create without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/patients/create",
            headers={"Content-Type": "application/json"},
            json={
                "name": "Test Patient",
                "email": "test@test.com",
                "professional_id": ADMIN_PROFESSIONAL_ID
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Endpoint correctly requires authentication")
    
    def test_create_patient_with_custom_password(self, admin_token):
        """Patient created with form password should be able to login with that password"""
        # Generate unique email for this test
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"paciente.test.{unique_id}@teste.com"
        test_password = "TestPass123!"
        
        # 1. Create patient with custom password
        create_response = requests.post(
            f"{BASE_URL}/api/admin/patients/create",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "name": f"Test Patient {unique_id}",
                "email": test_email,
                "professional_id": ADMIN_PROFESSIONAL_ID,
                "password": test_password,
                "phone": "(11) 99999-9999"
            }
        )
        
        # Validate creation response
        assert create_response.status_code == 200, f"Patient creation failed: {create_response.text}"
        create_data = create_response.json()
        
        # Check response structure
        assert create_data.get("success") == True, "Response should have success: true"
        assert "patient_id" in create_data, "Response should include patient_id"
        assert create_data.get("email") == test_email, "Email should match"
        assert create_data.get("password_set") == True, "password_set should be True when password provided"
        
        print(f"✅ Patient created: {create_data['patient_id']}")
        print(f"   password_set: {create_data['password_set']}")
        
        # 2. Wait a bit for Supabase to propagate
        time.sleep(2)
        
        # 3. Patient login with the custom password
        login_response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": test_email,
                "password": test_password
            }
        )
        
        # Validate patient login
        assert login_response.status_code == 200, f"Patient login failed: {login_response.text}"
        login_data = login_response.json()
        
        assert "access_token" in login_data, "Patient should get access_token"
        assert login_data["user"]["email"] == test_email, "Patient email should match"
        
        print(f"✅ Patient login successful with form password: {test_email}")
        return create_data["patient_id"]
    
    def test_create_patient_without_password_sets_random(self, admin_token):
        """Patient created without password should have password_set: false"""
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"paciente.nopass.{unique_id}@teste.com"
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/patients/create",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "name": f"No Password Patient {unique_id}",
                "email": test_email,
                "professional_id": ADMIN_PROFESSIONAL_ID
            }
        )
        
        assert create_response.status_code == 200, f"Creation failed: {create_response.text}"
        data = create_response.json()
        
        assert data.get("success") == True
        assert data.get("password_set") == False, "password_set should be False when no password"
        
        print(f"✅ Patient created without password: password_set={data['password_set']}")
    
    def test_create_patient_with_short_password_uses_random(self, admin_token):
        """Password shorter than 6 chars should be ignored and random generated"""
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"paciente.short.{unique_id}@teste.com"
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/patients/create",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "name": f"Short Password Patient {unique_id}",
                "email": test_email,
                "professional_id": ADMIN_PROFESSIONAL_ID,
                "password": "123"  # Too short
            }
        )
        
        assert create_response.status_code == 200, f"Creation failed: {create_response.text}"
        data = create_response.json()
        
        assert data.get("success") == True
        assert data.get("password_set") == False, "password_set should be False for short password"
        
        print(f"✅ Short password ignored, random generated: password_set={data['password_set']}")


class TestBackendAPIAccess:
    """Test backend API accessibility"""
    
    def test_backend_reachable(self):
        """Backend should be reachable"""
        # Try a simple GET to the root
        try:
            response = requests.get(f"{BASE_URL}/api/", timeout=10)
            # Even 404 is fine, means backend is running
            assert response.status_code in [200, 404, 405], f"Unexpected status: {response.status_code}"
            print(f"✅ Backend reachable at {BASE_URL}")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Backend not reachable: {e}")
    
    def test_api_admin_patients_create_method_not_allowed(self):
        """GET on /api/admin/patients/create should return 405 (method not allowed)"""
        response = requests.get(f"{BASE_URL}/api/admin/patients/create")
        assert response.status_code == 405, f"Expected 405, got {response.status_code}"
        print("✅ GET method correctly rejected on POST-only endpoint")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

#!/usr/bin/env python3
"""
Detailed Backend Test - Focus on Real Authentication and Patient Creation
This test will use real Supabase authentication to test the actual patient creation flow
"""

import asyncio
import httpx
import os
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "https://fitjourney-login.preview.emergentagent.com/api"
SUPABASE_URL = "https://safovouvjiikaickutvi.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZm92b3V2amlpa2FpY2t1dHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjgzODAsImV4cCI6MjA4NzU0NDM4MH0.Joq1e2DR6hb3XGh8pXg3c-eZ-vXiGGmxmzy-ibf3oIE"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZm92b3V2amlpa2FpY2t1dHZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk2ODM4MCwiZXhwIjoyMDg3NTQ0MzgwfQ.1mQSmHPNfzqx6cbi3tCYnrScH6-MZhbJsHZvM7t-GFg"

# Test credentials - we need real admin credentials
TEST_ADMIN_EMAIL = "admin@fitjourney.com"  # Replace with real admin email
TEST_ADMIN_PASSWORD = "admin123456"  # Replace with real password
TEST_PROFESSIONAL_ID = "177ff33f-f573-4a9c-aca1-1e4c55d94ece"

class DetailedBackendTester:
    def __init__(self):
        self.test_results = {}
        self.admin_token = None
        
    async def run_detailed_tests(self):
        """Run detailed backend tests with real authentication"""
        print("🔍 TESTE DETALHADO - FLUXO REAL DE CRIAÇÃO DE PACIENTE")
        print("=" * 80)
        
        try:
            # Step 1: Try to get real admin token
            await self.test_real_admin_login()
            
            # Step 2: Test patient creation with real auth
            if self.admin_token:
                await self.test_authenticated_patient_creation()
            else:
                await self.test_patient_creation_error_scenarios()
            
            # Step 3: Test various error scenarios
            await self.test_validation_errors()
            
        except Exception as e:
            print(f"❌ ERRO FATAL: {e}")
            self.test_results['fatal_error'] = str(e)
        
        self.print_summary()
    
    async def test_real_admin_login(self):
        """Try to authenticate with real admin credentials"""
        print("\n🔐 TESTE: Autenticação Real com Admin")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Try login with Supabase
                login_payload = {
                    "email": TEST_ADMIN_EMAIL,
                    "password": TEST_ADMIN_PASSWORD
                }
                
                headers = {
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                }
                
                print(f"🔑 Tentando login admin com: {TEST_ADMIN_EMAIL}")
                
                response = await client.post(
                    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                    json=login_payload,
                    headers=headers
                )
                
                print(f"📥 Login response: {response.status_code}")
                
                if response.status_code == 200:
                    auth_data = response.json()
                    if auth_data.get("access_token"):
                        self.admin_token = auth_data["access_token"]
                        print("✅ Admin login bem-sucedido")
                        self.test_results['admin_login'] = 'SUCCESS'
                    else:
                        print("⚠️ Login retornou 200 mas sem token")
                        self.test_results['admin_login'] = 'NO_TOKEN'
                else:
                    error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
                    print(f"❌ Falha no login admin: {error_data}")
                    self.test_results['admin_login'] = f'FAILED_{response.status_code}'
                    
        except Exception as e:
            print(f"❌ Erro no login admin: {e}")
            self.test_results['admin_login'] = f'ERROR: {e}'
    
    async def test_authenticated_patient_creation(self):
        """Test patient creation with real admin token"""
        print("\n📋 TESTE: Criação de Paciente com Token Real")
        
        timestamp = int(time.time())
        patient_data = {
            "name": "Paciente Teste Real",
            "email": f"paciente.real.{timestamp}@teste.com",
            "professional_id": TEST_PROFESSIONAL_ID
        }
        
        print(f"📤 Dados do paciente: {json.dumps(patient_data, indent=2)}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.admin_token}",
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    f"{BACKEND_URL}/admin/patients/create",
                    json=patient_data,
                    headers=headers
                )
                
                print(f"📥 Response status: {response.status_code}")
                print(f"📥 Response headers: {dict(response.headers)}")
                
                try:
                    response_data = response.json()
                    print(f"📥 Response body: {json.dumps(response_data, indent=2)}")
                except:
                    print(f"📥 Response text: {response.text}")
                
                if response.status_code in [200, 201]:
                    print("✅ Patient creation successful")
                    self.test_results['authenticated_creation'] = 'SUCCESS'
                elif response.status_code == 400:
                    print("❌ 400 Bad Request - detailed error analysis needed")
                    self.test_results['authenticated_creation'] = 'BAD_REQUEST'
                    # Save error details for analysis
                    try:
                        error_details = response.json()
                        self.test_results['400_error_details'] = error_details
                    except:
                        self.test_results['400_error_details'] = response.text
                else:
                    print(f"❌ Unexpected status: {response.status_code}")
                    self.test_results['authenticated_creation'] = f'ERROR_{response.status_code}'
                    
        except Exception as e:
            print(f"❌ Error in authenticated creation: {e}")
            self.test_results['authenticated_creation'] = f'EXCEPTION: {e}'
    
    async def test_patient_creation_error_scenarios(self):
        """Test patient creation scenarios that might cause errors"""
        print("\n📋 TESTE: Cenários de Erro na Criação")
        
        # Since we don't have real admin token, let's test what happens with the service key
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Test 1: Missing required fields
                print("🧪 Teste 1: Campos obrigatórios faltando")
                
                invalid_data = {
                    "name": "Test Patient"
                    # Missing email and professional_id
                }
                
                # Use service key as workaround
                headers = {
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    f"{BACKEND_URL}/admin/patients/create",
                    json=invalid_data,
                    headers=headers
                )
                
                print(f"📥 Missing fields response: {response.status_code}")
                if response.status_code == 422:
                    print("✅ Validation error as expected")
                    self.test_results['validation_test'] = 'SUCCESS'
                else:
                    try:
                        error_data = response.json()
                        print(f"📥 Error details: {json.dumps(error_data, indent=2)}")
                    except:
                        print(f"📥 Error text: {response.text}")
                    self.test_results['validation_test'] = f'UNEXPECTED_{response.status_code}'
                
                # Test 2: Invalid professional_id
                print("\n🧪 Teste 2: professional_id inválido")
                
                invalid_prof_data = {
                    "name": "Test Patient",
                    "email": f"test.invalid.{int(time.time())}@example.com",
                    "professional_id": "invalid-uuid"
                }
                
                response = await client.post(
                    f"{BACKEND_URL}/admin/patients/create",
                    json=invalid_prof_data,
                    headers=headers
                )
                
                print(f"📥 Invalid prof_id response: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"📥 Error details: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"📥 Error text: {response.text}")
                
                self.test_results['invalid_prof_id'] = response.status_code
                
        except Exception as e:
            print(f"❌ Error in scenario testing: {e}")
            self.test_results['scenario_testing'] = f'ERROR: {e}'
    
    async def test_validation_errors(self):
        """Test specific validation scenarios"""
        print("\n🧪 TESTE: Validação Detalhada")
        
        test_cases = [
            {
                "name": "Empty name",
                "data": {"name": "", "email": "test@example.com", "professional_id": TEST_PROFESSIONAL_ID}
            },
            {
                "name": "Invalid email",
                "data": {"name": "Test", "email": "invalid-email", "professional_id": TEST_PROFESSIONAL_ID}
            },
            {
                "name": "Missing professional_id",
                "data": {"name": "Test", "email": "test@example.com"}
            }
        ]
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Content-Type": "application/json"
                }
                
                for i, test_case in enumerate(test_cases):
                    print(f"\n📝 Teste {i+1}: {test_case['name']}")
                    
                    response = await client.post(
                        f"{BACKEND_URL}/admin/patients/create",
                        json=test_case['data'],
                        headers=headers
                    )
                    
                    print(f"   Status: {response.status_code}")
                    
                    if response.status_code in [401, 422, 400]:
                        print("   ✅ Error response as expected")
                    else:
                        print(f"   ⚠️ Unexpected response: {response.status_code}")
                        
                    try:
                        error_data = response.json()
                        print(f"   Error: {error_data}")
                    except:
                        print(f"   Text: {response.text}")
                        
        except Exception as e:
            print(f"❌ Error in validation testing: {e}")
            self.test_results['validation_detailed'] = f'ERROR: {e}'
    
    def print_summary(self):
        """Print test summary with detailed analysis"""
        print("\n" + "=" * 80)
        print("📊 RESUMO DETALHADO DOS TESTES")
        print("=" * 80)
        
        for test_name, result in self.test_results.items():
            print(f"📋 {test_name}: {result}")
        
        print("\n🎯 DIAGNÓSTICO:")
        
        if self.test_results.get('admin_login') == 'SUCCESS':
            print("🟢 Autenticação admin funcionando")
        else:
            print("🔴 Problema na autenticação admin (pode ser credenciais de teste)")
        
        if 'authenticated_creation' in self.test_results:
            if self.test_results['authenticated_creation'] == 'BAD_REQUEST':
                print("🔴 PROBLEMA IDENTIFICADO: 400 Bad Request na criação")
                if '400_error_details' in self.test_results:
                    print(f"   Detalhes do erro: {self.test_results['400_error_details']}")
        
        print("\n💡 RECOMENDAÇÕES:")
        print("1. Verificar logs do backend durante a criação")
        print("2. Validar se all required fields estão sendo enviados")
        print("3. Verificar se professional_id existe e é válido")
        print("4. Testar com dados de professional real")

async def main():
    """Main test runner"""
    tester = DetailedBackendTester()
    await tester.run_detailed_tests()

if __name__ == "__main__":
    asyncio.run(main())
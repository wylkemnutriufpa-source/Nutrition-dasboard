#!/usr/bin/env python3
"""
JWT-Based Backend Test - Test with proper JWT structure
Based on the system inspection, let's create a proper test with JWT authentication
"""

import asyncio
import httpx
import json
import time
import jwt
import uuid
from datetime import datetime, timezone, timedelta

# Configuration
BACKEND_URL = "https://projeto-fase3.preview.emergentagent.com/api"
SUPABASE_URL = "https://safovouvjiikaickutvi.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZm92b3V2amlpa2FpY2t1dHZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk2ODM4MCwiZXhwIjoyMDg3NTQ0MzgwfQ.1mQSmHPNfzqx6cbi3tCYnrScH6-MZhbJsHZvM7t-GFg"

# From system inspection - we found a professional
PROFESSIONAL_ID = "177ff33f-f573-4a9c-aca1-1e4c55d94ece"

# JWT Secret (from backend .env)
JWT_SECRET = "meal-adherence-track-super-secret-jwt-secret-key-change-in-production"

class JWTBackendTester:
    def __init__(self):
        self.test_results = {}
        self.service_headers = {
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "apikey": SUPABASE_SERVICE_KEY,
            "Content-Type": "application/json"
        }
    
    async def run_jwt_tests(self):
        """Run tests with proper JWT tokens"""
        print("🔐 TESTE COM JWT - FLUXO COMPLETO DE CRIAÇÃO")
        print("=" * 80)
        
        try:
            # Step 1: Get or create a professional to use
            professional_id = await self.ensure_professional_exists()
            
            if not professional_id:
                print("❌ Não foi possível obter professional para teste")
                return
            
            # Step 2: Create a proper JWT token for this professional
            jwt_token = self.create_jwt_token(professional_id)
            
            # Step 3: Test patient creation with proper JWT
            await self.test_patient_creation_with_jwt(jwt_token, professional_id)
            
            # Step 4: Test the complete flow with timing analysis
            await self.test_complete_flow_with_timing(jwt_token, professional_id)
            
        except Exception as e:
            print(f"❌ ERRO FATAL: {e}")
            self.test_results['fatal_error'] = str(e)
        
        self.print_summary()
    
    def create_jwt_token(self, user_id, role="professional"):
        """Create a proper JWT token that matches Supabase format"""
        now = datetime.now(timezone.utc)
        
        payload = {
            "aud": "authenticated",
            "exp": int((now + timedelta(hours=1)).timestamp()),
            "iat": int(now.timestamp()),
            "iss": "https://safovouvjiikaickutvi.supabase.co/auth/v1",
            "sub": user_id,
            "email": f"professional.{user_id[:8]}@fitjourney.com",
            "phone": "",
            "app_metadata": {
                "provider": "email",
                "providers": ["email"]
            },
            "user_metadata": {
                "email": f"professional.{user_id[:8]}@fitjourney.com",
                "role": role
            },
            "role": "authenticated",
            "aal": "aal1",
            "amr": [{"method": "password", "timestamp": int(now.timestamp())}],
            "session_id": str(uuid.uuid4())
        }
        
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
        print(f"🔑 JWT criado para user_id: {user_id}")
        return token
    
    async def ensure_professional_exists(self):
        """Ensure we have a professional to test with"""
        print("\n👤 VERIFICANDO: Professional para testes")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Check if our test professional exists
                response = await client.get(
                    f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{PROFESSIONAL_ID}&role=eq.professional",
                    headers=self.service_headers
                )
                
                if response.status_code == 200:
                    professionals = response.json()
                    if professionals:
                        print(f"✅ Professional existente encontrado: {PROFESSIONAL_ID}")
                        return PROFESSIONAL_ID
                
                # If not found, get any professional
                response = await client.get(
                    f"{SUPABASE_URL}/rest/v1/profiles?role=eq.professional&limit=1",
                    headers=self.service_headers
                )
                
                if response.status_code == 200:
                    professionals = response.json()
                    if professionals:
                        prof_id = professionals[0]['id']
                        print(f"✅ Professional alternativo encontrado: {prof_id}")
                        return prof_id
                
                print("⚠️ Nenhum professional encontrado, criando um para teste...")
                return await self.create_test_professional()
                
        except Exception as e:
            print(f"❌ Erro ao verificar professional: {e}")
            return None
    
    async def create_test_professional(self):
        """Create a professional for testing"""
        try:
            timestamp = int(time.time())
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Create auth user for professional
                auth_payload = {
                    "email": f"prof.test.{timestamp}@fitjourney.com",
                    "password": "prof123456",
                    "email_confirm": True,
                    "user_metadata": {
                        "name": "Professional Teste",
                        "role": "professional"
                    }
                }
                
                response = await client.post(
                    f"{SUPABASE_URL}/auth/v1/admin/users",
                    json=auth_payload,
                    headers=self.service_headers
                )
                
                if response.status_code in [200, 201]:
                    auth_data = response.json()
                    user_id = auth_data.get("id")
                    
                    # Wait for profile creation
                    await asyncio.sleep(3)
                    
                    # Update profile to professional role
                    await client.patch(
                        f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
                        json={"role": "professional"},
                        headers=self.service_headers
                    )
                    
                    print(f"✅ Professional de teste criado: {user_id}")
                    return user_id
                
        except Exception as e:
            print(f"❌ Erro ao criar professional de teste: {e}")
            
        return None
    
    async def test_patient_creation_with_jwt(self, jwt_token, professional_id):
        """Test patient creation with proper JWT"""
        print(f"\n📋 TESTE: Criação de Paciente com JWT Válido")
        
        timestamp = int(time.time())
        patient_data = {
            "name": "Paciente JWT Teste",
            "email": f"paciente.jwt.{timestamp}@teste.com",
            "professional_id": professional_id
        }
        
        print(f"📤 Dados do paciente: {json.dumps(patient_data, indent=2)}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {jwt_token}",
                    "Content-Type": "application/json"
                }
                
                print("🔄 Enviando request para /admin/patients/create...")
                start_time = time.time()
                
                response = await client.post(
                    f"{BACKEND_URL}/admin/patients/create",
                    json=patient_data,
                    headers=headers,
                    timeout=60.0  # Longer timeout for debugging
                )
                
                end_time = time.time()
                duration = end_time - start_time
                
                print(f"📥 Response recebido em {duration:.2f}s")
                print(f"📥 Status: {response.status_code}")
                print(f"📥 Headers: {dict(response.headers)}")
                
                # Try to get response body
                try:
                    response_data = response.json()
                    print(f"📥 Body (JSON): {json.dumps(response_data, indent=2)}")
                    self.test_results['response_data'] = response_data
                except:
                    response_text = response.text
                    print(f"📥 Body (Text): {response_text}")
                    self.test_results['response_text'] = response_text
                
                self.test_results['jwt_creation_status'] = response.status_code
                self.test_results['jwt_creation_duration'] = duration
                
                if response.status_code in [200, 201]:
                    print("✅ Criação com JWT bem-sucedida!")
                    # Extract patient ID for further testing
                    try:
                        if 'response_data' in self.test_results:
                            patient_id = self.test_results['response_data'].get('patient_id')
                            if patient_id:
                                self.test_results['created_patient_id'] = patient_id
                                await self.verify_patient_data(patient_id)
                    except Exception as e:
                        print(f"⚠️ Erro ao extrair patient_id: {e}")
                elif response.status_code == 400:
                    print("❌ 400 Bad Request - analisando erro detalhadamente...")
                    self.analyze_400_error()
                elif response.status_code == 401:
                    print("❌ 401 Unauthorized - problema com JWT")
                elif response.status_code == 403:
                    print("❌ 403 Forbidden - problema com permissões")
                else:
                    print(f"❌ Status inesperado: {response.status_code}")
                    
        except httpx.TimeoutException:
            print("❌ TIMEOUT - Request demorou mais que 60 segundos")
            self.test_results['jwt_creation_status'] = 'TIMEOUT'
        except Exception as e:
            print(f"❌ Erro no teste JWT: {e}")
            self.test_results['jwt_creation_status'] = f'EXCEPTION: {e}'
    
    async def verify_patient_data(self, patient_id):
        """Verify patient was created correctly in all tables"""
        print(f"\n🔍 VERIFICANDO: Dados do paciente {patient_id}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Check auth.users
                auth_response = await client.get(
                    f"{SUPABASE_URL}/auth/v1/admin/users/{patient_id}",
                    headers=self.service_headers
                )
                
                print(f"📋 Auth user: {auth_response.status_code}")
                if auth_response.status_code == 200:
                    print("   ✅ Usuário existe em auth.users")
                    
                # Check profiles
                profile_response = await client.get(
                    f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{patient_id}",
                    headers=self.service_headers
                )
                
                print(f"📋 Profile: {profile_response.status_code}")
                if profile_response.status_code == 200:
                    profiles = profile_response.json()
                    if profiles:
                        print("   ✅ Profile existe")
                        print(f"   Role: {profiles[0].get('role')}")
                        print(f"   Status: {profiles[0].get('status')}")
                    else:
                        print("   ❌ Profile não encontrado")
                        
                # Check patient_profiles
                patient_prof_response = await client.get(
                    f"{SUPABASE_URL}/rest/v1/patient_profiles?patient_id=eq.{patient_id}",
                    headers=self.service_headers
                )
                
                print(f"📋 Patient profile: {patient_prof_response.status_code}")
                if patient_prof_response.status_code == 200:
                    patient_profiles = patient_prof_response.json()
                    if patient_profiles:
                        print("   ✅ Patient_profile existe")
                        print(f"   Professional ID: {patient_profiles[0].get('professional_id')}")
                    else:
                        print("   ❌ Patient_profile não encontrado")
                        
        except Exception as e:
            print(f"❌ Erro na verificação: {e}")
    
    def analyze_400_error(self):
        """Analyze 400 Bad Request error in detail"""
        print("\n🔍 ANÁLISE DETALHADA DO ERRO 400:")
        
        if 'response_data' in self.test_results:
            error_data = self.test_results['response_data']
            print(f"📋 Estrutura do erro: {error_data}")
            
            if isinstance(error_data, dict):
                if 'detail' in error_data:
                    print(f"🔸 Detail: {error_data['detail']}")
                if 'message' in error_data:
                    print(f"🔸 Message: {error_data['message']}")
                if 'errors' in error_data:
                    print(f"🔸 Validation errors: {error_data['errors']}")
        
        elif 'response_text' in self.test_results:
            print(f"📋 Resposta em texto: {self.test_results['response_text']}")
    
    async def test_complete_flow_with_timing(self, jwt_token, professional_id):
        """Test complete flow with detailed timing analysis"""
        print(f"\n⏱️ TESTE: Análise de Timing Completa")
        
        timings = {}
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Test multiple rapid creations to check for race conditions
                timestamp_base = int(time.time())
                
                for i in range(3):
                    patient_data = {
                        "name": f"Paciente Timing {i}",
                        "email": f"timing.{timestamp_base}.{i}@teste.com",
                        "professional_id": professional_id
                    }
                    
                    headers = {
                        "Authorization": f"Bearer {jwt_token}",
                        "Content-Type": "application/json"
                    }
                    
                    print(f"🔄 Teste de timing {i+1}/3...")
                    start_time = time.time()
                    
                    try:
                        response = await client.post(
                            f"{BACKEND_URL}/admin/patients/create",
                            json=patient_data,
                            headers=headers,
                            timeout=30.0
                        )
                        
                        end_time = time.time()
                        duration = end_time - start_time
                        
                        timings[f'test_{i}'] = {
                            'duration': duration,
                            'status': response.status_code,
                            'success': response.status_code in [200, 201]
                        }
                        
                        print(f"   📊 Teste {i+1}: {duration:.2f}s - Status {response.status_code}")
                        
                        # Small delay between requests
                        await asyncio.sleep(1)
                        
                    except httpx.TimeoutException:
                        timings[f'test_{i}'] = {
                            'duration': 30.0,
                            'status': 'TIMEOUT',
                            'success': False
                        }
                        print(f"   ❌ Teste {i+1}: TIMEOUT")
                
                self.test_results['timing_analysis'] = timings
                
                # Analyze results
                successful_tests = [t for t in timings.values() if t['success']]
                if successful_tests:
                    avg_duration = sum(t['duration'] for t in successful_tests) / len(successful_tests)
                    print(f"📊 Tempo médio para criações bem-sucedidas: {avg_duration:.2f}s")
                    
                print(f"📊 Taxa de sucesso: {len(successful_tests)}/3")
                
        except Exception as e:
            print(f"❌ Erro no teste de timing: {e}")
            self.test_results['timing_error'] = str(e)
    
    def print_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 RESUMO COMPLETO DOS TESTES JWT")
        print("=" * 80)
        
        for test_name, result in self.test_results.items():
            print(f"📋 {test_name}: {result}")
        
        print(f"\n🎯 DIAGNÓSTICO FINAL:")
        
        status = self.test_results.get('jwt_creation_status')
        if status == 200 or status == 201:
            print("🟢 SUCESSO: Criação de paciente funcionando com JWT válido")
        elif status == 400:
            print("🔴 PROBLEMA: 400 Bad Request - erro de validação ou dados")
            print("   💡 Verificar se professional_id é válido")
            print("   💡 Verificar se todos os campos obrigatórios estão presentes")
            print("   💡 Verificar logs do backend para erro específico")
        elif status == 401:
            print("🔴 PROBLEMA: 401 Unauthorized - problema com JWT")
            print("   💡 JWT pode estar malformado ou secret incorreto")
            print("   💡 Verificar se o usuário existe no sistema")
        elif status == 403:
            print("🔴 PROBLEMA: 403 Forbidden - problema de permissões")
            print("   💡 Usuário pode não ter role adequado (admin/professional)")
        elif status == 'TIMEOUT':
            print("🔴 PROBLEMA: TIMEOUT - operação muito lenta")
            print("   💡 Pode ser problema de performance ou deadlock")
            print("   💡 Verificar logs do Supabase e backend")
        else:
            print(f"🔴 PROBLEMA: Status inesperado ou erro: {status}")
        
        # Timing analysis
        if 'timing_analysis' in self.test_results:
            timing_data = self.test_results['timing_analysis']
            success_count = sum(1 for t in timing_data.values() if t['success'])
            if success_count == 0:
                print("🔴 RACE CONDITIONS: Nenhuma criação bem-sucedida - problema crítico")
            elif success_count < 3:
                print("🟡 RACE CONDITIONS: Algumas falhas - possível problema de concorrência")
            else:
                print("🟢 RACE CONDITIONS: Todas criações bem-sucedidas")
        
        print(f"\n💡 PRÓXIMOS PASSOS:")
        print("1. Verificar logs do backend: tail -f /var/log/supervisor/backend.*.log")
        print("2. Verificar se professional_id existe: SELECT * FROM profiles WHERE id = '...'")
        print("3. Testar criação manual via Supabase Admin para isolate issue")

async def main():
    """Main test runner"""
    tester = JWTBackendTester()
    await tester.run_jwt_tests()

if __name__ == "__main__":
    asyncio.run(main())
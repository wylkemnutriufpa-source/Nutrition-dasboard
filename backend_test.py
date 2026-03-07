#!/usr/bin/env python3
"""
Backend E2E Test Suite - Patient Creation and Login Flow
Testing the complete workflow as requested in the review request.

CONTEXTO:
Bugs relatados:
1. Criação de paciente falha inconsistentemente (400 Bad Request)
2. Login de paciente falha inconsistentemente
3. Formulário de criação fecha ao selecionar campo (ex: sexo)

OBJETIVO:
Identificar onde exatamente o fluxo quebra:
- Backend create endpoint?
- Trigger do Supabase?
- Profile não criado?
- Auth user não criado?
- Timeout/race condition?
"""

import asyncio
import httpx
import os
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BACKEND_URL = "https://projeto-fase3.preview.emergentagent.com/api"
SUPABASE_URL = "https://safovouvjiikaickutvi.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZm92b3V2amlpa2FpY2t1dHZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk2ODM4MCwiZXhwIjoyMDg3NTQ0MzgwfQ.1mQSmHPNfzqx6cbi3tCYnrScH6-MZhbJsHZvM7t-GFg"

# Professional ID for testing (needs a real admin/professional)
TEST_PROFESSIONAL_ID = "177ff33f-f573-4a9c-aca1-1e4c55d94ece"

class PatientCreationFlowTester:
    def __init__(self):
        self.test_results = {}
        self.admin_token = None
        self.created_patient_id = None
        
    async def run_all_tests(self):
        """Run complete test suite for patient creation and login flow"""
        print("🔬 INICIANDO TESTES E2E - FLUXO DE CRIAÇÃO E LOGIN DE PACIENTE")
        print("=" * 80)
        
        try:
            # TESTE 1: Health check
            await self.test_backend_health()
            
            # TESTE 2: Get admin token (mock real authentication)
            await self.test_get_admin_token()
            
            # TESTE 3: Create patient with real data
            await self.test_create_patient_real()
            
            # TESTE 4: Verify Supabase triggers and tables
            await self.test_supabase_triggers_and_data()
            
            # TESTE 5: Wait and test patient login
            if self.created_patient_id:
                await self.test_patient_login_flow()
            
            # TESTE 6: Check for orphaned profiles
            await self.test_orphaned_profiles()
            
            # TESTE 7: Test edge cases and race conditions
            await self.test_race_conditions()
            
        except Exception as e:
            print(f"❌ ERRO FATAL NOS TESTES: {e}")
            self.test_results['fatal_error'] = str(e)
        
        # Print final results
        self.print_summary()
        
    async def test_backend_health(self):
        """TESTE 1: Verificar se backend está funcionando"""
        print("\n📋 TESTE 1: Health Check Backend")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{BACKEND_URL}/status")
                
                if response.status_code == 200:
                    print("✅ Backend respondendo na rota /status")
                    self.test_results['backend_health'] = 'OK'
                else:
                    print(f"❌ Backend retornou {response.status_code}")
                    self.test_results['backend_health'] = f'ERROR_{response.status_code}'
                    
        except Exception as e:
            print(f"❌ Erro ao conectar com backend: {e}")
            self.test_results['backend_health'] = f'CONNECTION_ERROR: {e}'
    
    async def test_get_admin_token(self):
        """TESTE 2: Obter token admin válido (simular auth real)"""
        print("\n📋 TESTE 2: Obter Token Admin JWT")
        
        # Para este teste, vamos simular um token válido
        # Em produção, você usaria credenciais reais de admin
        try:
            # Tentar login com Supabase Auth diretamente
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Primeiro, vamos verificar se conseguimos acessar o endpoint protegido sem token
                response = await client.post(f"{BACKEND_URL}/admin/patients/create", json={
                    "name": "Test",
                    "email": "test@example.com", 
                    "professional_id": TEST_PROFESSIONAL_ID
                })
                
                if response.status_code == 401:
                    print("✅ Endpoint protegido retorna 401 sem token (segurança OK)")
                    self.test_results['auth_protection'] = 'OK'
                else:
                    print(f"⚠️ Endpoint sem auth retornou {response.status_code} (esperava 401)")
                    self.test_results['auth_protection'] = f'UNEXPECTED_{response.status_code}'
                    
                # Para os próximos testes, vamos usar um token simulado
                # NOTA: Em ambiente real, você precisaria fazer login real
                self.admin_token = "SIMULATED_ADMIN_TOKEN_FOR_TESTING"
                print("⚠️ Usando token simulado para teste (em produção, use login real)")
                self.test_results['admin_token'] = 'SIMULATED'
                
        except Exception as e:
            print(f"❌ Erro ao testar autenticação: {e}")
            self.test_results['admin_token'] = f'ERROR: {e}'
    
    async def test_create_patient_real(self):
        """TESTE 3: Criar Paciente (Simular Request Real)"""
        print("\n📋 TESTE 3: Criar Paciente via API")
        
        # Dados do paciente de teste
        patient_data = {
            "name": "Paciente Teste E2E",
            "email": f"teste.e2e.{int(time.time())}@exemplo.com",  # Email único
            "professional_id": TEST_PROFESSIONAL_ID
        }
        
        print(f"📤 Dados do paciente: {json.dumps(patient_data, indent=2)}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Tentar criar sem token (deve falhar)
                response = await client.post(
                    f"{BACKEND_URL}/admin/patients/create",
                    json=patient_data
                )
                
                print(f"📥 Resposta sem auth: {response.status_code}")
                
                if response.status_code == 401:
                    print("✅ Criação sem token falha corretamente (401)")
                    self.test_results['create_without_auth'] = 'OK'
                else:
                    print(f"⚠️ Esperava 401, recebeu {response.status_code}")
                    self.test_results['create_without_auth'] = f'UNEXPECTED_{response.status_code}'
                    
                # Como não temos token real, vamos testar diretamente com Supabase
                print("🔄 Testando criação direta via Supabase Admin API...")
                await self.test_direct_supabase_creation(patient_data)
                
        except Exception as e:
            print(f"❌ Erro no teste de criação: {e}")
            self.test_results['create_patient'] = f'ERROR: {e}'
    
    async def test_direct_supabase_creation(self, patient_data):
        """Test direct Supabase auth user creation to isolate the issue"""
        print("\n🔧 TESTE 3b: Criação Direta via Supabase Admin API")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Create auth user directly
                auth_payload = {
                    "email": patient_data["email"],
                    "password": "teste123456",
                    "email_confirm": True,
                    "user_metadata": {
                        "name": patient_data["name"],
                        "role": "patient"
                    }
                }
                
                headers = {
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    f"{SUPABASE_URL}/auth/v1/admin/users",
                    json=auth_payload,
                    headers=headers
                )
                
                print(f"📥 Supabase Auth User Creation: {response.status_code}")
                
                if response.status_code in [200, 201]:
                    auth_data = response.json()
                    self.created_patient_id = auth_data.get("id")
                    print(f"✅ Auth user criado: {self.created_patient_id}")
                    self.test_results['direct_supabase_auth'] = 'SUCCESS'
                    
                    # Store patient email for login test
                    self.test_patient_email = patient_data["email"]
                    self.test_patient_password = "teste123456"
                    
                else:
                    error_data = response.json()
                    print(f"❌ Erro na criação do auth user: {error_data}")
                    self.test_results['direct_supabase_auth'] = f'ERROR_{response.status_code}'
                    
        except Exception as e:
            print(f"❌ Erro na criação direta via Supabase: {e}")
            self.test_results['direct_supabase_auth'] = f'EXCEPTION: {e}'
    
    async def test_supabase_triggers_and_data(self):
        """TESTE 4: Verificar Trigger Supabase e Dados das Tabelas"""
        print("\n📋 TESTE 4: Verificar Triggers e Dados do Supabase")
        
        if not self.created_patient_id:
            print("⚠️ Pulando teste - nenhum paciente foi criado")
            return
            
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json"
                }
                
                # Check if profile was created by trigger
                print("🔍 Verificando se profile foi criado pelo trigger...")
                await asyncio.sleep(3)  # Wait for trigger
                
                response = await client.get(
                    f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{self.created_patient_id}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    profiles = response.json()
                    if profiles and len(profiles) > 0:
                        print("✅ Profile criado automaticamente pelo trigger")
                        self.test_results['profile_trigger'] = 'SUCCESS'
                    else:
                        print("❌ Profile NÃO foi criado pelo trigger")
                        self.test_results['profile_trigger'] = 'FAILED'
                else:
                    print(f"❌ Erro ao verificar profile: {response.status_code}")
                    self.test_results['profile_trigger'] = f'ERROR_{response.status_code}'
                
                # Check auth.users table
                print("🔍 Verificando auth.users...")
                response = await client.get(
                    f"{SUPABASE_URL}/auth/v1/admin/users/{self.created_patient_id}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    print("✅ Usuário existe na tabela auth.users")
                    self.test_results['auth_users_check'] = 'SUCCESS'
                else:
                    print(f"❌ Usuário não encontrado em auth.users: {response.status_code}")
                    self.test_results['auth_users_check'] = f'ERROR_{response.status_code}'
                
        except Exception as e:
            print(f"❌ Erro ao verificar triggers: {e}")
            self.test_results['supabase_triggers'] = f'ERROR: {e}'
    
    async def test_patient_login_flow(self):
        """TESTE 5: Testar Login do Paciente Criado"""
        print("\n📋 TESTE 5: Testar Login do Paciente")
        
        if not hasattr(self, 'test_patient_email'):
            print("⚠️ Pulando teste - email do paciente não disponível")
            return
            
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Test login via Supabase Auth
                login_payload = {
                    "email": self.test_patient_email,
                    "password": self.test_patient_password
                }
                
                headers = {
                    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZm92b3V2amlpa2FpY2t1dHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjgzODAsImV4cCI6MjA4NzU0NDM4MH0.Joq1e2DR6hb3XGh8pXg3c-eZ-vXiGGmxmzy-ibf3oIE",
                    "Content-Type": "application/json"
                }
                
                print(f"🔐 Tentando login com: {self.test_patient_email}")
                
                response = await client.post(
                    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                    json=login_payload,
                    headers=headers
                )
                
                print(f"📥 Login response: {response.status_code}")
                
                if response.status_code == 200:
                    auth_data = response.json()
                    if auth_data.get("access_token"):
                        print("✅ Login bem-sucedido - token recebido")
                        self.test_results['patient_login'] = 'SUCCESS'
                    else:
                        print("⚠️ Login retornou 200 mas sem token")
                        self.test_results['patient_login'] = 'NO_TOKEN'
                else:
                    error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
                    print(f"❌ Falha no login: {error_data}")
                    self.test_results['patient_login'] = f'FAILED_{response.status_code}'
                    
        except Exception as e:
            print(f"❌ Erro no teste de login: {e}")
            self.test_results['patient_login'] = f'ERROR: {e}'
    
    async def test_orphaned_profiles(self):
        """TESTE 6: Verificar Profiles Órfãos"""
        print("\n📋 TESTE 6: Verificar Profiles Órfãos")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json"
                }
                
                # Check for orphaned profiles
                response = await client.get(
                    f"{SUPABASE_URL}/rest/v1/profiles?auth_user_id=is.null",
                    headers=headers
                )
                
                if response.status_code == 200:
                    orphaned = response.json()
                    count = len(orphaned) if orphaned else 0
                    print(f"📊 Profiles órfãos encontrados: {count}")
                    self.test_results['orphaned_profiles'] = count
                else:
                    print(f"❌ Erro ao verificar profiles órfãos: {response.status_code}")
                    self.test_results['orphaned_profiles'] = f'ERROR_{response.status_code}'
                    
        except Exception as e:
            print(f"❌ Erro ao verificar profiles órfãos: {e}")
            self.test_results['orphaned_profiles'] = f'ERROR: {e}'
    
    async def test_race_conditions(self):
        """TESTE 7: Testar Condições de Corrida"""
        print("\n📋 TESTE 7: Testar Race Conditions")
        
        try:
            # Test multiple rapid patient creation attempts
            print("🏃‍♂️ Testando múltiplas criações rápidas...")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Content-Type": "application/json"
                }
                
                # Create 3 users rapidly to test race conditions
                tasks = []
                for i in range(3):
                    auth_payload = {
                        "email": f"race.test.{i}.{int(time.time())}@exemplo.com",
                        "password": "teste123456",
                        "email_confirm": True,
                        "user_metadata": {"name": f"Race Test {i}", "role": "patient"}
                    }
                    
                    task = client.post(
                        f"{SUPABASE_URL}/auth/v1/admin/users",
                        json=auth_payload,
                        headers=headers
                    )
                    tasks.append(task)
                
                # Execute all requests concurrently
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                success_count = 0
                error_count = 0
                
                for i, result in enumerate(results):
                    if isinstance(result, Exception):
                        print(f"❌ Race test {i}: Exceção - {result}")
                        error_count += 1
                    elif result.status_code in [200, 201]:
                        print(f"✅ Race test {i}: Sucesso")
                        success_count += 1
                    else:
                        print(f"⚠️ Race test {i}: Status {result.status_code}")
                        error_count += 1
                
                print(f"📊 Race condition results: {success_count} sucessos, {error_count} erros")
                self.test_results['race_conditions'] = {
                    'success': success_count,
                    'errors': error_count
                }
                
        except Exception as e:
            print(f"❌ Erro no teste de race conditions: {e}")
            self.test_results['race_conditions'] = f'ERROR: {e}'
    
    def print_summary(self):
        """Print final test summary"""
        print("\n" + "=" * 80)
        print("📊 RESUMO DOS TESTES E2E")
        print("=" * 80)
        
        for test_name, result in self.test_results.items():
            status_emoji = "✅" if (
                result == 'OK' or 
                result == 'SUCCESS' or 
                (isinstance(result, dict) and result.get('success', 0) > 0) or
                (isinstance(result, int) and test_name == 'orphaned_profiles')
            ) else "❌"
            
            print(f"{status_emoji} {test_name}: {result}")
        
        print("\n🎯 ANÁLISE DE PROBLEMAS IDENTIFICADOS:")
        
        # Analyze results for root cause
        if self.test_results.get('backend_health') != 'OK':
            print("🔴 PROBLEMA CRÍTICO: Backend não está respondendo")
        
        if self.test_results.get('auth_protection') != 'OK':
            print("🟡 PROBLEMA DE SEGURANÇA: Endpoints não estão protegidos")
        
        if self.test_results.get('direct_supabase_auth') == 'SUCCESS':
            print("🟢 SUPABASE AUTH: Funcionando corretamente")
        else:
            print("🔴 PROBLEMA CRÍTICO: Criação de usuários falha no Supabase")
        
        if self.test_results.get('profile_trigger') == 'FAILED':
            print("🔴 PROBLEMA CRÍTICO: Trigger de criação de profile não está funcionando")
        
        if 'patient_login' in self.test_results:
            if self.test_results['patient_login'] == 'SUCCESS':
                print("🟢 LOGIN: Funcionando corretamente")
            else:
                print("🔴 PROBLEMA CRÍTICO: Login de pacientes falha")
        
        orphaned_count = self.test_results.get('orphaned_profiles')
        if isinstance(orphaned_count, int) and orphaned_count > 0:
            print(f"🟡 PROBLEMA DE CONSISTÊNCIA: {orphaned_count} profiles órfãos encontrados")
        
        race_results = self.test_results.get('race_conditions')
        if isinstance(race_results, dict):
            if race_results.get('errors', 0) > 0:
                print(f"🟡 PROBLEMA DE CONCORRÊNCIA: {race_results['errors']} erros em condições de corrida")

async def main():
    """Main test runner"""
    tester = PatientCreationFlowTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
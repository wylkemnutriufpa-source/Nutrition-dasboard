#!/usr/bin/env python3
"""
System Inspection Test - Check current Supabase data structure
"""

import asyncio
import httpx
import json

# Configuration
SUPABASE_URL = "https://safovouvjiikaickutvi.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhZm92b3V2amlpa2FpY2t1dHZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk2ODM4MCwiZXhwIjoyMDg3NTQ0MzgwfQ.1mQSmHPNfzqx6cbi3tCYnrScH6-MZhbJsHZvM7t-GFg"

class SystemInspector:
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "apikey": SUPABASE_SERVICE_KEY,
            "Content-Type": "application/json"
        }
    
    async def inspect_system(self):
        """Inspect current system data structure"""
        print("🔍 INSPEÇÃO DO SISTEMA - ESTRUTURA ATUAL")
        print("=" * 80)
        
        try:
            await self.check_profiles()
            await self.check_auth_users()
            await self.check_patient_profiles()
            await self.check_triggers()
            
        except Exception as e:
            print(f"❌ ERRO FATAL: {e}")
    
    async def check_profiles(self):
        """Check profiles table structure and data"""
        print("\n📋 VERIFICANDO TABELA: profiles")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Get profiles with limit
                response = await client.get(
                    f"{SUPABASE_URL}/rest/v1/profiles?select=*&limit=5",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    profiles = response.json()
                    print(f"✅ Encontrados {len(profiles)} profiles")
                    
                    if profiles:
                        print("📋 Exemplo de profile:")
                        example = profiles[0]
                        for key, value in example.items():
                            print(f"   {key}: {value}")
                        
                        # Count by role
                        roles = {}
                        for profile in profiles:
                            role = profile.get('role', 'unknown')
                            roles[role] = roles.get(role, 0) + 1
                        print(f"📊 Roles encontrados: {roles}")
                    
                else:
                    print(f"❌ Erro ao acessar profiles: {response.status_code}")
                    print(f"   Response: {response.text}")
                    
        except Exception as e:
            print(f"❌ Erro ao verificar profiles: {e}")
    
    async def check_auth_users(self):
        """Check auth.users table"""
        print("\n🔐 VERIFICANDO: auth.users")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Get recent users
                response = await client.get(
                    f"{SUPABASE_URL}/auth/v1/admin/users?per_page=5",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    users = data.get('users', [])
                    print(f"✅ Encontrados {len(users)} auth users")
                    
                    if users:
                        print("📋 Exemplo de auth user:")
                        example = users[0]
                        print(f"   id: {example.get('id')}")
                        print(f"   email: {example.get('email')}")
                        print(f"   created_at: {example.get('created_at')}")
                        print(f"   confirmed_at: {example.get('confirmed_at')}")
                        print(f"   user_metadata: {example.get('user_metadata')}")
                    
                else:
                    print(f"❌ Erro ao acessar auth users: {response.status_code}")
                    print(f"   Response: {response.text}")
                    
        except Exception as e:
            print(f"❌ Erro ao verificar auth users: {e}")
    
    async def check_patient_profiles(self):
        """Check patient_profiles table"""
        print("\n👥 VERIFICANDO TABELA: patient_profiles")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{SUPABASE_URL}/rest/v1/patient_profiles?select=*&limit=5",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    patient_profiles = response.json()
                    print(f"✅ Encontrados {len(patient_profiles)} patient_profiles")
                    
                    if patient_profiles:
                        print("📋 Exemplo de patient_profile:")
                        example = patient_profiles[0]
                        for key, value in example.items():
                            print(f"   {key}: {value}")
                    
                else:
                    print(f"❌ Erro ao acessar patient_profiles: {response.status_code}")
                    print(f"   Response: {response.text}")
                    
        except Exception as e:
            print(f"❌ Erro ao verificar patient_profiles: {e}")
    
    async def check_triggers(self):
        """Check if profile creation triggers exist"""
        print("\n⚡ VERIFICANDO: Triggers do Banco")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # This is a PostgreSQL specific query to check triggers
                sql_query = """
                SELECT 
                    trigger_name,
                    event_manipulation,
                    event_object_table,
                    action_statement
                FROM information_schema.triggers 
                WHERE event_object_schema = 'public' 
                AND trigger_name LIKE '%profile%';
                """
                
                # Try to execute via PostgREST
                response = await client.post(
                    f"{SUPABASE_URL}/rest/v1/rpc/sql",
                    json={"sql": sql_query},
                    headers=self.headers
                )
                
                print(f"📋 Trigger query response: {response.status_code}")
                if response.status_code == 200:
                    triggers = response.json()
                    if triggers:
                        print("✅ Triggers encontrados:")
                        for trigger in triggers:
                            print(f"   {trigger}")
                    else:
                        print("⚠️ Nenhum trigger profile encontrado")
                else:
                    print("⚠️ Não foi possível verificar triggers (pode ser limitação RPC)")
                    
        except Exception as e:
            print(f"⚠️ Erro ao verificar triggers: {e}")
    
    async def test_profile_creation_manually(self):
        """Test manual profile creation to understand the flow"""
        print("\n🧪 TESTE: Criação Manual de Profile")
        
        try:
            # First create an auth user
            async with httpx.AsyncClient(timeout=30.0) as client:
                timestamp = int(asyncio.get_event_loop().time())
                
                auth_payload = {
                    "email": f"test.manual.{timestamp}@example.com",
                    "password": "test123456",
                    "email_confirm": True,
                    "user_metadata": {
                        "name": "Test Manual User",
                        "role": "patient"
                    }
                }
                
                print("🔄 Criando auth user...")
                response = await client.post(
                    f"{SUPABASE_URL}/auth/v1/admin/users",
                    json=auth_payload,
                    headers=self.headers
                )
                
                if response.status_code in [200, 201]:
                    auth_data = response.json()
                    user_id = auth_data.get("id")
                    print(f"✅ Auth user criado: {user_id}")
                    
                    # Wait a bit for triggers
                    await asyncio.sleep(3)
                    
                    # Check if profile was created
                    profile_response = await client.get(
                        f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
                        headers=self.headers
                    )
                    
                    if profile_response.status_code == 200:
                        profiles = profile_response.json()
                        if profiles:
                            print("✅ Profile criado automaticamente pelo trigger")
                            print(f"   Profile data: {profiles[0]}")
                        else:
                            print("❌ Profile NÃO foi criado automaticamente")
                            
                            # Try to create manually
                            print("🔄 Tentando criar profile manualmente...")
                            
                            profile_data = {
                                "id": user_id,
                                "email": auth_payload["email"],
                                "name": "Test Manual User",
                                "role": "patient"
                            }
                            
                            manual_response = await client.post(
                                f"{SUPABASE_URL}/rest/v1/profiles",
                                json=profile_data,
                                headers=self.headers
                            )
                            
                            print(f"📋 Manual profile creation: {manual_response.status_code}")
                            if manual_response.status_code in [200, 201]:
                                print("✅ Profile criado manualmente")
                            else:
                                print(f"❌ Falha na criação manual: {manual_response.text}")
                    
                else:
                    print(f"❌ Falha na criação do auth user: {response.text}")
                    
        except Exception as e:
            print(f"❌ Erro no teste manual: {e}")

async def main():
    """Main inspection runner"""
    inspector = SystemInspector()
    await inspector.inspect_system()
    await inspector.test_profile_creation_manually()

if __name__ == "__main__":
    asyncio.run(main())
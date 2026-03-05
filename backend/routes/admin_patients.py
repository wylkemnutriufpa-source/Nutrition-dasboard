"""
Admin Patient Management Routes
Criar pacientes via Supabase Auth Admin API
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import httpx
import secrets
import string

router = APIRouter(prefix="/admin/patients", tags=["admin-patients"])

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Validar config ao usar as rotas (não no import)
def validate_config():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados no backend/.env"
        )


class CreatePatientRequest(BaseModel):
    name: str
    email: EmailStr
    professional_id: str
    phone: Optional[str] = None
    birth_date: Optional[str] = None


class InvitePatientRequest(BaseModel):
    email: EmailStr
    redirect_to: Optional[str] = None


def generate_temp_password(length: int = 16) -> str:
    """Gera senha temporária forte"""
    alphabet = string.ascii_letters + string.digits + "!@#$%&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


@router.post("/create")
async def create_patient(request: CreatePatientRequest):
    """
    Cria paciente usando Supabase Auth Admin API
    - Cria usuário em auth.users
    - Cria profile em public.profiles
    - Cria entrada em public.patient_profiles
    """
    validate_config()  # Validar configuração
    
    try:
        # 1. Criar usuário no Supabase Auth (Admin API)
        async with httpx.AsyncClient() as client:
            # Gerar senha temporária (usuário vai trocar via magic link)
            temp_password = generate_temp_password()
            
            auth_response = await client.post(
                f"{SUPABASE_URL}/auth/v1/admin/users",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "email": request.email,
                    "password": temp_password,
                    "email_confirm": True,  # Auto-confirmar email
                    "user_metadata": {
                        "name": request.name,
                        "role": "patient"
                    }
                }
            )
            
            if auth_response.status_code not in [200, 201]:
                error_detail = auth_response.json()
                raise HTTPException(
                    status_code=400,
                    detail=f"Erro ao criar usuário no Auth: {error_detail.get('msg', 'Erro desconhecido')}"
                )
            
            auth_data = auth_response.json()
            patient_id = auth_data["id"]
            
            print(f"✅ Usuário criado no Auth: {patient_id}")
        
        # 2. Criar profile em public.profiles
        async with httpx.AsyncClient() as client:
            profile_response = await client.post(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                json={
                    "id": patient_id,
                    "auth_user_id": patient_id,
                    "email": request.email,
                    "name": request.name,
                    "role": "patient",
                    "status": "active"
                }
            )
            
            if profile_response.status_code not in [200, 201]:
                error_detail = profile_response.json()
                print(f"⚠️ Erro ao criar profile: {error_detail}")
                # Continuar mesmo com erro (profile pode já existir)
        
        # 3. Criar patient_profile
        async with httpx.AsyncClient() as client:
            patient_profile_response = await client.post(
                f"{SUPABASE_URL}/rest/v1/patient_profiles",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                json={
                    "patient_id": patient_id,
                    "professional_id": request.professional_id
                }
            )
            
            if patient_profile_response.status_code not in [200, 201]:
                error_detail = patient_profile_response.json()
                raise HTTPException(
                    status_code=400,
                    detail=f"Erro ao criar patient_profile: {error_detail}"
                )
        
        return {
            "success": True,
            "patient_id": patient_id,
            "email": request.email,
            "message": "Paciente criado com sucesso!"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao criar paciente: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.post("/invite")
async def invite_patient(request: InvitePatientRequest):
    """
    Envia magic link para paciente (ou retorna link para teste)
    """
    validate_config()  # Validar configuração
    
    try:
        async with httpx.AsyncClient() as client:
            # Gerar magic link via Admin API
            invite_response = await client.post(
                f"{SUPABASE_URL}/auth/v1/admin/generate_link",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "type": "magiclink",
                    "email": request.email,
                    "options": {
                        "redirect_to": request.redirect_to or f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/patient/home"
                    }
                }
            )
            
            if invite_response.status_code not in [200, 201]:
                error_detail = invite_response.json()
                raise HTTPException(
                    status_code=400,
                    detail=f"Erro ao gerar magic link: {error_detail}"
                )
            
            invite_data = invite_response.json()
            
            return {
                "success": True,
                "email": request.email,
                "action_link": invite_data.get("action_link"),  # Para debug/teste
                "message": "Magic link gerado! (Em produção, seria enviado por email)"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao enviar invite: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.get("/verify/{patient_id}")
async def verify_patient(patient_id: str):
    """
    Verifica se paciente existe e está corretamente configurado
    """
    validate_config()  # Validar configuração
    
    try:
        async with httpx.AsyncClient() as client:
            # Verificar no Auth
            auth_response = await client.get(
                f"{SUPABASE_URL}/auth/v1/admin/users/{patient_id}",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY
                }
            )
            
            auth_exists = auth_response.status_code == 200
            
            # Verificar profile
            profile_response = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{patient_id}",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY
                }
            )
            
            profile_data = profile_response.json() if profile_response.status_code == 200 else []
            
            # Verificar patient_profile
            patient_profile_response = await client.get(
                f"{SUPABASE_URL}/rest/v1/patient_profiles?patient_id=eq.{patient_id}",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY
                }
            )
            
            patient_profile_data = patient_profile_response.json() if patient_profile_response.status_code == 200 else []
            
            return {
                "patient_id": patient_id,
                "auth_exists": auth_exists,
                "profile_exists": len(profile_data) > 0,
                "patient_profile_exists": len(patient_profile_data) > 0,
                "profile": profile_data[0] if profile_data else None,
                "patient_profile": patient_profile_data[0] if patient_profile_data else None
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

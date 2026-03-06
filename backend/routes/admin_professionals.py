"""
Admin Professional Management Routes
Criar profissionais via Supabase Auth Admin API
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import httpx
import secrets
import string

router = APIRouter(prefix="/admin/professionals", tags=["admin-professionals"])

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def validate_config():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados"
        )


class CreateProfessionalRequest(BaseModel):
    name: str
    email: EmailStr
    tier: str = "trial"  # trial, basic, pro
    phone: Optional[str] = None


def generate_temp_password(length: int = 16) -> str:
    """Gera senha temporária forte"""
    alphabet = string.ascii_letters + string.digits + "!@#$%&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


@router.post("/create")
async def create_professional(request: CreateProfessionalRequest):
    """
    Cria profissional usando Supabase Auth Admin API
    
    - Cria usuário em auth.users com role='professional'
    - Cria profile em public.profiles com role='professional'
    - Cria entrada em public.professional_feature_overrides com tier
    
    **IMPORTANTE:** Garante que role seja 'professional', não 'admin'
    """
    validate_config()
    
    # Validar tier
    valid_tiers = ['trial', 'basic', 'pro']
    if request.tier not in valid_tiers:
        raise HTTPException(
            status_code=400,
            detail=f"Tier inválido. Use: {', '.join(valid_tiers)}"
        )
    
    try:
        # 1. Criar usuário no Supabase Auth
        async with httpx.AsyncClient() as client:
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
                    "email_confirm": True,
                    "user_metadata": {
                        "name": request.name,
                        "role": "professional"  # 🔒 CRÍTICO: role = professional
                    }
                }
            )
            
            if auth_response.status_code not in [200, 201]:
                error_detail = auth_response.json()
                raise HTTPException(
                    status_code=400,
                    detail=f"Erro ao criar usuário: {error_detail.get('msg', 'Erro desconhecido')}"
                )
            
            auth_data = auth_response.json()
            professional_id = auth_data["id"]
            
            print(f"✅ Professional criado no Auth: {professional_id}")
        
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
                    "id": professional_id,
                    "auth_user_id": professional_id,
                    "email": request.email,
                    "name": request.name,
                    "role": "professional",  # 🔒 CRÍTICO: role = professional
                    "status": "active",
                    "phone": request.phone
                }
            )
            
            if profile_response.status_code not in [200, 201]:
                error_detail = profile_response.json()
                print(f"⚠️ Erro ao criar profile: {error_detail}")
        
        # 3. Criar professional_feature_overrides (tier)
        async with httpx.AsyncClient() as client:
            override_response = await client.post(
                f"{SUPABASE_URL}/rest/v1/professional_feature_overrides",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                json={
                    "professional_id": professional_id,
                    "tier": request.tier,
                    "active": True
                }
            )
            
            if override_response.status_code not in [200, 201]:
                error_detail = override_response.json()
                print(f"⚠️ Erro ao criar feature override: {error_detail}")
        
        return {
            "success": True,
            "professional_id": professional_id,
            "email": request.email,
            "tier": request.tier,
            "temp_password": temp_password,  # Retornar para admin copiar
            "message": f"Profissional criado com tier '{request.tier}'!"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao criar profissional: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.get("/list")
async def list_professionals():
    """Lista todos os profissionais"""
    validate_config()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY
                },
                params={
                    "role": "eq.professional",
                    "select": "*"
                }
            )
            
            if response.status_code == 200:
                return {"professionals": response.json()}
            else:
                raise HTTPException(status_code=500, detail="Erro ao listar profissionais")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{professional_id}")
async def get_professional(professional_id: str):
    """Obter detalhes de um profissional específico"""
    validate_config()
    
    try:
        async with httpx.AsyncClient() as client:
            # Profile
            profile_response = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{professional_id}",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY
                }
            )
            
            profile_data = profile_response.json() if profile_response.status_code == 200 else []
            
            # Feature overrides (tier)
            override_response = await client.get(
                f"{SUPABASE_URL}/rest/v1/professional_feature_overrides?professional_id=eq.{professional_id}",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY
                }
            )
            
            override_data = override_response.json() if override_response.status_code == 200 else []
            
            if not profile_data:
                raise HTTPException(status_code=404, detail="Profissional não encontrado")
            
            return {
                "professional": profile_data[0],
                "tier": override_data[0].get("tier") if override_data else "trial"
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{professional_id}/tier")
async def update_professional_tier(professional_id: str, tier: str):
    """Atualizar tier do profissional"""
    validate_config()
    
    valid_tiers = ['trial', 'basic', 'pro']
    if tier not in valid_tiers:
        raise HTTPException(
            status_code=400,
            detail=f"Tier inválido. Use: {', '.join(valid_tiers)}"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{SUPABASE_URL}/rest/v1/professional_feature_overrides?professional_id=eq.{professional_id}",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
                json={"tier": tier}
            )
            
            if response.status_code == 200:
                return {"success": True, "tier": tier}
            else:
                raise HTTPException(status_code=500, detail="Erro ao atualizar tier")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

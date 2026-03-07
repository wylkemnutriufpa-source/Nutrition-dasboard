"""
Admin Patient Management Routes
Criar pacientes via Supabase Auth Admin API

SEGURANÇA:
  Todos os endpoints exigem JWT válido + role de aplicação = admin ou professional.
  O role é lido de public.profiles (nunca do JWT payload).
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import httpx
import secrets
import logging

from security.auth import get_current_user_with_db_role, CurrentUser
from utils.structured_logger import log_operation, log_guard_failure, log_duplicate_prevention

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/patients", tags=["admin-patients"])

# Roles que podem operar neste router
_ALLOWED_ROLES = {"admin", "professional"}

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


def _require_admin_or_professional(current_user: CurrentUser) -> None:
    """
    Valida que o role real (de public.profiles) é admin ou professional.
    Lança HTTP 403 caso contrário.

    NÃO confia no role do JWT — usa current_user.app_role (lido do DB).
    """
    if current_user.app_role not in _ALLOWED_ROLES:
        logger.warning(
            f"🚫 Acesso negado: user_id={current_user.user_id} "
            f"app_role={current_user.app_role!r} tentou acessar rota de criação de paciente"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Acesso negado. Requer role: admin ou professional. "
                f"Role atual: {current_user.app_role!r}"
            ),
        )


class CreatePatientRequest(BaseModel):
    name: str
    email: EmailStr
    professional_id: str
    password: Optional[str] = None
    phone: Optional[str] = None
    birth_date: Optional[str] = None


class InvitePatientRequest(BaseModel):
    email: EmailStr
    redirect_to: Optional[str] = None


def _supabase_headers() -> dict:
    """Headers comuns para chamadas Supabase Admin"""
    return {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
    }


async def _delete_auth_user(client: httpx.AsyncClient, user_id: str) -> None:
    """
    Rollback: deleta auth user criado caso alguma etapa seguinte falhe.
    Fail-silently para não mascarar o erro original.
    """
    try:
        resp = await client.delete(
            f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            headers=_supabase_headers(),
        )
        if resp.status_code in [200, 204]:
            logger.info(f"🗑️ Rollback: auth user {user_id} deletado com sucesso")
        else:
            logger.warning(f"⚠️ Rollback: falha ao deletar auth user {user_id}: {resp.status_code}")
    except Exception as exc:
        logger.error(f"❌ Rollback: exceção ao deletar auth user {user_id}: {exc}")


@router.post("/create")
async def create_patient(
    request: CreatePatientRequest,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Cria paciente usando Supabase Auth Admin API.

    Requer: JWT válido + profiles.role = admin | professional

    Operação atômica:
    1. Verifica tier do profissional (e limites trial)
    2. Cria auth user (sem expor temp_password na resposta)
    3. Cria public.profiles  → falha = rollback auth user + HTTP 400
    4. Cria public.patient_profiles → falha = rollback auth user + HTTP 400
    5. Cria patient_subscriptions (best-effort, log de aviso se falhar)

    Acesso do paciente é feito exclusivamente via magic link (/invite).
    """
    _require_admin_or_professional(current_user)
    validate_config()

    from datetime import datetime, timedelta

    patient_id: Optional[str] = None
    prof_tier: str = "trial"

    try:
        async with httpx.AsyncClient() as client:
            # ── 0. Verificar tier do profissional ──────────────────────────────
            prof_tier_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/professional_feature_overrides"
                f"?professional_id=eq.{request.professional_id}",
                headers=_supabase_headers(),
            )
            prof_tier_data = prof_tier_resp.json() if prof_tier_resp.status_code == 200 else []
            prof_tier = prof_tier_data[0].get("tier", "trial") if prof_tier_data else "trial"

            # Limite de pacientes removido — todos os tiers podem criar pacientes livremente

            # ── 1. Criar auth user ─────────────────────────────────────────────
            # Usa a senha enviada pelo formulário. Se não informada, gera uma aleatória.
            user_password = request.password if request.password and len(request.password) >= 6 else secrets.token_urlsafe(16)

            # 🛡️ IDEMPOTÊNCIA: Verificar se email já existe
            check_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers=_supabase_headers(),
                params={"email": f"eq.{request.email}", "select": "id,email"},
            )
            if check_resp.status_code == 200:
                existing = check_resp.json()
                if existing and len(existing) > 0:
                    log_duplicate_prevention(
                        action="create_patient",
                        actor_user_id=current_user.user_id,
                        duplicate_key=request.email,
                        route="/api/admin/patients/create"
                    )
                    raise HTTPException(
                        status_code=409,
                        detail=f"Email {request.email} já está cadastrado no sistema"
                    )

            auth_resp = await client.post(
                f"{SUPABASE_URL}/auth/v1/admin/users",
                headers=_supabase_headers(),
                json={
                    "email": request.email,
                    "password": user_password,
                    "email_confirm": True,
                    "user_metadata": {"name": request.name, "role": "patient"},
                },
            )

            if auth_resp.status_code not in [200, 201]:
                error_detail = auth_resp.json()
                raise HTTPException(
                    status_code=400,
                    detail=f"Erro ao criar usuário no Auth: {error_detail.get('msg', error_detail)}",
                )

            auth_data = auth_resp.json()
            patient_id = auth_data["id"]
            logger.info(f"✅ Auth user criado: {patient_id} (prof tier: {prof_tier})")

            # ── 2. Aguardar trigger criar profile automaticamente ─────────────
            # Polling robusto: até 5 tentativas, 1 seg entre cada
            import asyncio
            logger.info("⏳ Aguardando trigger do Supabase criar profile...")
            profile_found = False
            for attempt in range(5):
                await asyncio.sleep(1)
                profile_check = await client.get(
                    f"{SUPABASE_URL}/rest/v1/profiles",
                    headers=_supabase_headers(),
                    params={"id": f"eq.{patient_id}", "select": "*"}
                )
                if profile_check.status_code == 200 and profile_check.json():
                    profile_found = True
                    logger.info(f"✅ Profile detectado na tentativa {attempt + 1}")
                    break
                logger.info(f"⏳ Tentativa {attempt + 1}/5 — profile ainda não criado")
            
            if not profile_found:
                logger.error("❌ Trigger não criou profile após 5 tentativas - abortando")
                await _delete_auth_user(client, patient_id)
                raise HTTPException(
                    status_code=500,
                    detail="Erro: profile não foi criado automaticamente após 5 tentativas"
                )
            
            # Atualizar profile com dados adicionais
            await client.patch(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers=_supabase_headers(),
                params={"id": f"eq.{patient_id}"},
                json={"name": request.name, "status": "active"}
            )

            logger.info("✅ Profile criado automaticamente e atualizado")

            # ── 3. Criar public.patient_profiles ──────────────────────────────
            patient_profile_resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/patient_profiles",
                headers={**_supabase_headers(), "Prefer": "return=representation"},
                json={
                    "patient_id": patient_id,
                    "professional_id": request.professional_id,
                },
            )

            if patient_profile_resp.status_code not in [200, 201]:
                error_detail = patient_profile_resp.json()
                logger.error(f"❌ Falha ao criar patient_profile: {error_detail}")
                # Rollback: deletar auth user (profiles cascade por FK ou manual abaixo)
                await _delete_auth_user(client, patient_id)
                raise HTTPException(
                    status_code=400,
                    detail=f"Erro ao criar patient_profile: {error_detail}",
                )

            logger.info(f"✅ patient_profile criado para {patient_id}")

            # ── 4. Criar patient_subscriptions (best-effort) ───────────────────
            if prof_tier == "trial":
                patient_tier = "trial"
                start_date = datetime.now().date()
                end_date = start_date + timedelta(days=7)
            else:
                patient_tier = "basic"
                start_date = datetime.now().date()
                end_date = None

            sub_resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/patient_subscriptions",
                headers={**_supabase_headers(), "Prefer": "return=representation"},
                json={
                    "patient_id": patient_id,
                    "professional_id": request.professional_id,
                    "tier": patient_tier,
                    "package_type": "mensal",
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat() if end_date else None,
                    "status": "active",
                },
            )

            if sub_resp.status_code not in [200, 201]:
                # Não crítico: logar mas continuar
                logger.warning(f"⚠️ Erro ao criar subscription (não crítico): {sub_resp.json()}")
            else:
                logger.info(f"✅ Subscription criada para {patient_id} (tier: {patient_tier})")

        # 🟢 LOG: Operação bem-sucedida
        log_operation(
            action="create_patient",
            status="success",
            actor_user_id=current_user.user_id,
            target_user_id=patient_id,
            org_id=request.professional_id,
            route="/api/admin/patients/create",
            extra_data={"tier": patient_tier, "email": request.email}
        )

        # ── Resposta final ─────────────────────────────────────────────────
        password_was_custom = bool(request.password and len(request.password) >= 6)
        return {
            "success": True,
            "patient_id": patient_id,
            "email": request.email,
            "tier": patient_tier,
            "access_days": 7 if prof_tier == "trial" else None,
            "password_set": password_was_custom,
            "message": (
                f"Paciente criado com sucesso! "
                f"{'(Trial – 7 dias de acesso) ' if prof_tier == 'trial' else ''}"
                f"{'O paciente pode fazer login com a senha informada.' if password_was_custom else 'Envie o magic link para o primeiro acesso.'}"
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro inesperado ao criar paciente: {e}")
        
        # 🔴 LOG: Erro inesperado
        log_operation(
            action="create_patient",
            status="error",
            actor_user_id=current_user.user_id,
            org_id=request.professional_id,
            route="/api/admin/patients/create",
            error_detail=str(e)
        )
        
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.post("/invite")
async def invite_patient(
    request: InvitePatientRequest,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Gera magic link para o paciente (acesso inicial).
    Requer: JWT válido + profiles.role = admin | professional
    """
    _require_admin_or_professional(current_user)
    validate_config()
    
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
async def verify_patient(
    patient_id: str,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Verifica se paciente existe e está corretamente configurado.
    Requer: JWT válido + profiles.role = admin | professional
    """
    _require_admin_or_professional(current_user)
    validate_config()
    
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

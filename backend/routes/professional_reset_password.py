"""
Professional Password Reset Routes
Permite professional resetar senha de seus pacientes via Supabase Admin API

SEGURANÇA:
  Requer JWT válido + profiles.role = professional
  Valida que o paciente pertence ao professional
  Usa Supabase Admin API updateUserById
  Não envia email (reset manual/administrativo)
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
import os
import httpx
import logging

from security.auth import get_current_user_with_db_role, CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/professional/patients", tags=["professional-password-reset"])

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def validate_config():
    """Valida que as variáveis de ambiente estão configuradas"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados no backend/.env"
        )


def _require_professional(current_user: CurrentUser) -> None:
    """
    Valida que o role real (de public.profiles) é professional.
    Lança HTTP 403 caso contrário.
    
    NÃO confia no role do JWT — usa current_user.app_role (lido do DB).
    """
    if current_user.app_role != "professional":
        logger.warning(
            f"🚫 Acesso negado: user_id={current_user.user_id} "
            f"app_role={current_user.app_role!r} tentou resetar senha de paciente"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acesso negado. Requer role: professional. Role atual: {current_user.app_role!r}",
        )


def _supabase_headers() -> dict:
    """Headers comuns para chamadas Supabase Admin"""
    return {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
    }


class ResetPasswordRequest(BaseModel):
    new_password: str


@router.post("/{patient_id}/reset-password")
async def reset_patient_password(
    patient_id: str,
    request: ResetPasswordRequest,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Reseta senha de um paciente (reset administrativo/manual, sem email).
    
    Requer: JWT válido + profiles.role = professional
    Valida: Paciente deve pertencer ao professional autenticado
    
    Usa Supabase Admin API updateUserById para alterar senha diretamente.
    Não envia email - é um reset manual feito pelo professional.
    
    Args:
        patient_id: ID do paciente cuja senha será resetada
        request: Contém new_password
        current_user: Usuário autenticado (injetado pelo dependency)
    
    Returns:
        Dict com success=True
    
    Raises:
        403: Se current_user não for professional ou paciente não pertencer a ele
        404: Se paciente não existir
        400: Se patient_id não for realmente um patient
        500: Erro interno ou de comunicação com Supabase
    """
    _require_professional(current_user)
    validate_config()
    
    # Validar senha
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Senha deve ter no mínimo 6 caracteres"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            # 1. Verificar se o patient_id existe e tem role=patient
            profile_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers=_supabase_headers(),
                params={"id": f"eq.{patient_id}", "select": "id,role,email"},
            )
            
            if profile_resp.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail="Erro ao verificar paciente no banco de dados"
                )
            
            profiles = profile_resp.json()
            
            if not profiles or len(profiles) == 0:
                raise HTTPException(
                    status_code=404,
                    detail=f"Paciente {patient_id} não encontrado"
                )
            
            profile = profiles[0]
            
            if profile.get("role") != "patient":
                raise HTTPException(
                    status_code=400,
                    detail=f"Usuário {patient_id} não é um paciente (role: {profile.get('role')})"
                )
            
            # 2. Verificar se o paciente pertence ao professional autenticado
            patient_profile_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/patient_profiles",
                headers=_supabase_headers(),
                params={
                    "patient_id": f"eq.{patient_id}",
                    "professional_id": f"eq.{current_user.user_id}",
                    "select": "patient_id,professional_id"
                },
            )
            
            if patient_profile_resp.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail="Erro ao verificar vínculo paciente-professional"
                )
            
            patient_profiles = patient_profile_resp.json()
            
            if not patient_profiles or len(patient_profiles) == 0:
                logger.warning(
                    f"🚫 Professional {current_user.user_id} tentou resetar senha de "
                    f"paciente {patient_id} que não pertence a ele"
                )
                raise HTTPException(
                    status_code=403,
                    detail=f"Paciente {patient_id} não pertence a você"
                )
            
            logger.info(
                f"🔐 Professional {current_user.user_id} resetando senha de paciente "
                f"{patient_id} ({profile.get('email')})"
            )
            
            # 3. Atualizar senha via Supabase Admin API
            update_resp = await client.put(
                f"{SUPABASE_URL}/auth/v1/admin/users/{patient_id}",
                headers=_supabase_headers(),
                json={"password": request.new_password},
            )
            
            if update_resp.status_code not in [200, 201]:
                error_detail = update_resp.json()
                logger.error(f"❌ Erro ao atualizar senha: {error_detail}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Erro ao atualizar senha no Supabase Auth: {error_detail.get('msg', error_detail)}"
                )
            
            logger.info(f"✅ Senha do paciente {patient_id} atualizada com sucesso")
            
            return {
                "success": True,
                "message": f"Senha do paciente {profile.get('email')} resetada com sucesso",
                "patient_id": patient_id,
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro inesperado ao resetar senha: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno ao resetar senha: {str(e)}"
        )

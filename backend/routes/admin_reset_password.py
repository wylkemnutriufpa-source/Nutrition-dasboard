"""
Admin Password Reset Routes
Permite admin resetar senha de profissionais via Supabase Admin API

SEGURANÇA:
  Requer JWT válido + profiles.role = admin
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
from utils.structured_logger import log_operation, log_guard_failure

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/professionals", tags=["admin-password-reset"])

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


def _require_admin(current_user: CurrentUser) -> None:
    """
    Valida que o role real (de public.profiles) é admin.
    Lança HTTP 403 caso contrário.
    
    NÃO confia no role do JWT — usa current_user.app_role (lido do DB).
    """
    if current_user.app_role != "admin":
        logger.warning(
            f"🚫 Acesso negado: user_id={current_user.user_id} "
            f"app_role={current_user.app_role!r} tentou resetar senha de professional"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acesso negado. Requer role: admin. Role atual: {current_user.app_role!r}",
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


@router.post("/{professional_id}/reset-password")
async def reset_professional_password(
    professional_id: str,
    request: ResetPasswordRequest,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Reseta senha de um professional (reset administrativo/manual, sem email).
    
    Requer: JWT válido + profiles.role = admin
    
    Usa Supabase Admin API updateUserById para alterar senha diretamente.
    Não envia email - é um reset manual feito pelo administrador.
    
    Args:
        professional_id: ID do professional cuja senha será resetada
        request: Contém new_password
        current_user: Usuário autenticado (injetado pelo dependency)
    
    Returns:
        Dict com success=True
    
    Raises:
        403: Se current_user não for admin
        404: Se professional não existir
        400: Se professional_id não for realmente um professional
        500: Erro interno ou de comunicação com Supabase
    """
    _require_admin(current_user)
    validate_config()
    
    # Validar senha
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Senha deve ter no mínimo 6 caracteres"
        )
    
    try:
        async with httpx.AsyncClient() as client:
            # 1. Verificar se o professional_id existe e tem role=professional
            profile_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles",
                headers=_supabase_headers(),
                params={"id": f"eq.{professional_id}", "select": "id,role,email"},
            )
            
            if profile_resp.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail="Erro ao verificar professional no banco de dados"
                )
            
            profiles = profile_resp.json()
            
            if not profiles or len(profiles) == 0:
                raise HTTPException(
                    status_code=404,
                    detail=f"Professional {professional_id} não encontrado"
                )
            
            profile = profiles[0]
            
            if profile.get("role") != "professional":
                raise HTTPException(
                    status_code=400,
                    detail=f"Usuário {professional_id} não é um professional (role: {profile.get('role')})"
                )
            
            logger.info(
                f"🔐 Admin {current_user.user_id} resetando senha de professional "
                f"{professional_id} ({profile.get('email')})"
            )
            
            # 2. Atualizar senha via Supabase Admin API
            update_resp = await client.put(
                f"{SUPABASE_URL}/auth/v1/admin/users/{professional_id}",
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
            
            logger.info(f"✅ Senha do professional {professional_id} atualizada com sucesso")
            
            # 🟢 LOG: Reset de senha bem-sucedido
            log_operation(
                action="reset_professional_password",
                status="success",
                actor_user_id=current_user.user_id,
                target_user_id=professional_id,
                route="/api/admin/professionals/{id}/reset-password",
                extra_data={"target_email": profile.get('email')}
            )
            
            return {
                "success": True,
                "message": f"Senha do professional {profile.get('email')} resetada com sucesso",
                "professional_id": professional_id,
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro inesperado ao resetar senha: {e}")
        
        # 🔴 LOG: Erro inesperado
        log_operation(
            action="reset_professional_password",
            status="error",
            actor_user_id=current_user.user_id,
            target_user_id=professional_id,
            route="/api/admin/professionals/{id}/reset-password",
            error_detail=str(e)
        )
        
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno ao resetar senha: {str(e)}"
        )

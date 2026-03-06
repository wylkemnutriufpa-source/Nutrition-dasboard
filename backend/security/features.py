"""
Feature Flag Enforcement Module

Garante que apenas usuários com permissão possam acessar features premium.
Usa a função Supabase can_access_feature() como source of truth.
"""

from fastapi import HTTPException, status
from supabase import create_client, Client
import os
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

# Supabase client com SERVICE_ROLE_KEY para bypass de RLS
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    logger.warning("⚠️ Supabase credentials not found for feature enforcement")
    supabase_client: Client | None = None
else:
    supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


async def require_feature(user_id: str, feature_key: str) -> Dict[str, Any]:
    """
    Verifica se o usuário tem acesso à feature.
    
    Args:
        user_id: UUID do usuário
        feature_key: Chave da feature (ex: 'automations', 'ia_plan')
    
    Returns:
        Dict com {allowed: bool, readonly: bool, reason: str}
    
    Raises:
        HTTPException 403: Se acesso negado
        HTTPException 500: Se erro na verificação
    """
    
    if not supabase_client:
        logger.error("❌ Supabase client not initialized")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Feature verification system unavailable"
        )
    
    try:
        # Chamar função Supabase can_access_feature
        result = supabase_client.rpc(
            "can_access_feature",
            {
                "p_user_id": user_id,
                "p_feature_key": feature_key
            }
        ).execute()
        
        if not result.data:
            logger.error(f"❌ Feature check failed for user {user_id}, feature {feature_key}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Feature check failed"
            )
        
        access: Dict[str, Any] = result.data
        
        # Verificar se tem permissão
        if not access.get("allowed", False):
            reason = access.get("reason", "Access denied")
            logger.warning(f"🚫 User {user_id} denied access to feature '{feature_key}': {reason}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Feature '{feature_key}' not available. {reason}"
            )
        
        # Log de acesso concedido
        readonly_status = "readonly" if access.get("readonly", False) else "full access"
        logger.info(f"✅ User {user_id} granted {readonly_status} to feature '{feature_key}'")
        
        return access
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error checking feature access: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error verifying feature access"
        )


async def check_feature_readonly(user_id: str, feature_key: str) -> bool:
    """
    Verifica se o usuário tem acesso readonly à feature.
    
    Args:
        user_id: UUID do usuário
        feature_key: Chave da feature
    
    Returns:
        True se readonly, False se full access
    """
    access = await require_feature(user_id, feature_key)
    return access.get("readonly", False)


# Mapeamento de features para rotas
FEATURE_KEYS = {
    "automations": "Automações inteligentes",
    "ia_plan": "Geração de planos com IA",
    "smart_reports": "Relatórios inteligentes",
    "resource_center": "Central de recursos",
    "project_biquini_branco": "Projeto Biquíni Branco",
    "scheduled_plan": "Programador de dieta"
}


def get_feature_name(feature_key: str) -> str:
    """Retorna nome amigável da feature"""
    return FEATURE_KEYS.get(feature_key, feature_key)

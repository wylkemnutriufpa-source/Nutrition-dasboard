"""
Structured Logger para operações críticas do FitJourney

Padroniza logs com campos consistentes para facilitar monitoring e debugging.

Uso:
    from utils.structured_logger import log_operation
    
    log_operation(
        action="create_patient",
        actor_user_id=current_user.user_id,
        target_user_id=patient_id,
        status="success",
        route="/api/admin/patients/create"
    )
"""

import logging
import json
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


def log_operation(
    action: str,
    status: str,
    actor_user_id: Optional[str] = None,
    target_user_id: Optional[str] = None,
    org_id: Optional[str] = None,
    route: Optional[str] = None,
    error_detail: Optional[str] = None,
    extra_data: Optional[dict] = None,
):
    """
    Loga operação crítica com campos padronizados.
    
    Args:
        action: Ação executada (ex: "create_patient", "reset_password", "run_automation")
        status: "success", "error", "warning", "blocked"
        actor_user_id: ID do usuário que executou a ação
        target_user_id: ID do usuário afetado pela ação (se aplicável)
        org_id: ID da organização (professional_id geralmente)
        route: Endpoint da API (ex: "/api/admin/patients/create")
        error_detail: Detalhes do erro (se status="error")
        extra_data: Dados adicionais específicos da operação
    """
    
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "status": status,
        "actor_user_id": actor_user_id,
        "target_user_id": target_user_id,
        "org_id": org_id,
        "route": route,
        "error_detail": error_detail,
    }
    
    if extra_data:
        log_entry["extra"] = extra_data
    
    # Remove campos None para log mais limpo
    log_entry = {k: v for k, v in log_entry.items() if v is not None}
    
    # Log formatado
    log_message = json.dumps(log_entry, ensure_ascii=False)
    
    if status == "error":
        logger.error(f"🔴 {log_message}")
    elif status == "warning":
        logger.warning(f"🟡 {log_message}")
    elif status == "blocked":
        logger.warning(f"🚫 {log_message}")
    else:
        logger.info(f"🟢 {log_message}")
    
    return log_entry


def log_guard_failure(
    action: str,
    actor_user_id: Optional[str] = None,
    reason: str = "unauthorized",
    route: Optional[str] = None,
    required_role: Optional[str] = None,
    actual_role: Optional[str] = None,
):
    """
    Loga falha de autorização/guard.
    
    Args:
        action: Ação que foi tentada
        actor_user_id: ID do usuário que tentou
        reason: "unauthorized", "forbidden", "invalid_role", "rate_limit", etc
        route: Endpoint tentado
        required_role: Role necessário
        actual_role: Role atual do usuário
    """
    
    extra = {}
    if required_role:
        extra["required_role"] = required_role
    if actual_role:
        extra["actual_role"] = actual_role
    
    return log_operation(
        action=action,
        status="blocked",
        actor_user_id=actor_user_id,
        route=route,
        error_detail=reason,
        extra_data=extra if extra else None,
    )


def log_duplicate_prevention(
    action: str,
    actor_user_id: Optional[str] = None,
    duplicate_key: Optional[str] = None,
    route: Optional[str] = None,
):
    """
    Loga quando uma operação foi prevenida por duplicação.
    
    Args:
        action: Ação que foi prevenida
        actor_user_id: ID do usuário
        duplicate_key: Chave de deduplicação (email, etc)
        route: Endpoint
    """
    
    extra = {}
    if duplicate_key:
        extra["duplicate_key"] = duplicate_key
    
    return log_operation(
        action=action,
        status="blocked",
        actor_user_id=actor_user_id,
        route=route,
        error_detail="duplicate_prevented",
        extra_data=extra if extra else None,
    )

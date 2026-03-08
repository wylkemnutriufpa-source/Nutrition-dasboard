"""
Protocols Routes - Projeto Biquíni Branco
Gerenciamento de protocolos e patient_protocols

SEGURANÇA:
  - GET /api/patient/protocols/active: requer role=patient
  - GET /api/professional/protocols: requer role=professional/admin
  - GET /api/professional/patients/{patient_id}/protocols: requer role=professional/admin
  - POST /api/professional/protocols/activate: requer role=professional/admin
  - POST /api/professional/protocols: criar novo protocolo (requer role=professional/admin)
  - PUT /api/professional/protocols/{protocol_id}: editar protocolo (requer role=professional/admin)
  - DELETE /api/professional/protocols/{protocol_id}: excluir protocolo (requer role=professional/admin)
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, List, Any
import os
import httpx
import logging
from datetime import date, timedelta

from security.auth import get_current_user_with_db_role, CurrentUser
from utils.structured_logger import log_operation

logger = logging.getLogger(__name__)

router = APIRouter(tags=["protocols"])

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def _supabase_headers() -> dict:
    """Headers comuns para chamadas Supabase"""
    return {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
    }


class ActivateProtocolRequest(BaseModel):
    patient_id: str
    protocol_id: str
    start_date: Optional[str] = None
    duration_days: Optional[int] = None


class CreateProtocolRequest(BaseModel):
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    default_duration_days: Optional[int] = 30
    tasks: Optional[List[Any]] = []


class UpdateProtocolRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    default_duration_days: Optional[int] = None
    tasks: Optional[List[Any]] = None


@router.get("/patient/protocols/active")
async def get_active_protocols(
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Retorna protocolos ativos do paciente logado.
    
    Requer: role=patient
    """
    if current_user.app_role != "patient":
        raise HTTPException(
            status_code=403,
            detail="Apenas pacientes podem acessar seus protocolos"
        )
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Buscar patient_protocols ativos
            pp_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/patient_protocols",
                headers=_supabase_headers(),
                params={
                    "patient_id": f"eq.{current_user.user_id}",
                    "status": "eq.active",
                    "select": "*,protocols(*)"
                }
            )
            
            if pp_resp.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail="Erro ao buscar protocolos ativos"
                )
            
            patient_protocols = pp_resp.json()
            
            # Formatar resposta
            protocols = []
            for pp in patient_protocols:
                protocol = pp.get('protocols', {})
                protocols.append({
                    'id': pp['id'],
                    'protocol_id': pp['protocol_id'],
                    'name': protocol.get('name'),
                    'category': protocol.get('category'),
                    'description': protocol.get('description'),
                    'instructions': protocol.get('instructions'),
                    'status': pp['status'],
                    'progress_day': pp.get('progress_day', 0),
                    'default_duration_days': protocol.get('default_duration_days'),
                    'start_date': pp.get('start_date'),
                    'end_date': pp.get('end_date')
                })
            
            log_operation(
                action="get_active_protocols",
                status="success",
                actor_user_id=current_user.user_id,
                route="/api/patient/protocols/active"
            )
            
            return {"protocols": protocols}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao buscar protocolos ativos: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno: {str(e)}"
        )


@router.get("/patient/protocols/{protocol_id}")
async def get_protocol_details(
    protocol_id: str,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Retorna detalhes de um protocolo específico.
    
    Requer: role=patient
    """
    if current_user.app_role != "patient":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Buscar patient_protocol
            pp_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/patient_protocols",
                headers=_supabase_headers(),
                params={
                    "id": f"eq.{protocol_id}",
                    "patient_id": f"eq.{current_user.user_id}",
                    "select": "*,protocols(*),protocol_tasks(*)"
                }
            )
            
            if pp_resp.status_code != 200:
                raise HTTPException(status_code=500, detail="Erro ao buscar protocolo")
            
            data = pp_resp.json()
            if not data or len(data) == 0:
                raise HTTPException(status_code=404, detail="Protocolo não encontrado")
            
            return data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao buscar protocolo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/professional/protocols/activate")
async def activate_protocol(
    request: ActivateProtocolRequest,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Ativa um protocolo para um paciente.
    
    Requer: role=professional ou admin
    """
    if current_user.app_role not in ["professional", "admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Buscar protocolo
            protocol_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/protocols",
                headers=_supabase_headers(),
                params={"id": f"eq.{request.protocol_id}", "select": "*"}
            )
            
            if protocol_resp.status_code != 200:
                raise HTTPException(status_code=500, detail="Erro ao buscar protocolo")
            
            protocols = protocol_resp.json()
            if not protocols:
                raise HTTPException(status_code=404, detail="Protocolo não encontrado")
            
            protocol = protocols[0]
            
            # Calcular datas e determinar status
            start = request.start_date or date.today().isoformat()
            start_date_obj = date.fromisoformat(start)
            # Protocolo futuro → scheduled; hoje ou passado → active imediatamente
            proto_status = "scheduled" if start_date_obj > date.today() else "active"
            duration = request.duration_days or protocol.get('default_duration_days', 30)
            end = (start_date_obj + timedelta(days=duration)).isoformat()
            
            # Criar patient_protocol
            pp_resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/patient_protocols",
                headers={**_supabase_headers(), "Prefer": "return=representation"},
                json={
                    "patient_id": request.patient_id,
                    "protocol_id": request.protocol_id,
                    "org_id": current_user.user_id,  # professional_id
                    "status": proto_status,
                    "start_date": start,
                    "end_date": end,
                    "progress_day": 0
                }
            )
            
            if pp_resp.status_code not in [200, 201]:
                error = pp_resp.json()
                raise HTTPException(
                    status_code=400,
                    detail=f"Erro ao ativar protocolo: {error}"
                )
            
            patient_protocol = pp_resp.json()[0]
            patient_protocol_id = patient_protocol["id"]

            # 🎯 AUTO SYNC: só injeta tasks se o protocolo começa hoje (status=active)
            sync_result = {"injected": 0, "skipped": 0}
            if proto_status == "active":
                try:
                    from routes.protocol_checklist import sync_protocol_tasks_to_checklist

                    sync_result = await sync_protocol_tasks_to_checklist(
                        patient_protocol_id=patient_protocol_id,
                        current_user=current_user,
                    )
                    logger.info(
                        f"✅ Auto-sync: {sync_result.get('injected', 0)} tasks injetadas no checklist "
                        f"de {request.patient_id} via protocolo '{protocol.get('name')}'"
                    )
                except Exception as sync_err:
                    logger.warning(f"⚠️ Auto-sync falhou (não crítico): {sync_err}")

                # 📅 TIMELINE: protocolo ativado (best-effort)
                try:
                    from utils.timeline_helpers import record_timeline_event
                    await record_timeline_event(
                        patient_id=request.patient_id,
                        event_type="protocol_activated",
                        payload={"protocol_name": protocol.get("name", "?")},
                    )
                except Exception:
                    pass
            else:
                logger.info(
                    f"⏳ Protocolo '{protocol.get('name')}' programado para {start} "
                    f"(status=scheduled — tasks serão injetadas na data de início)"
                )

                # 📅 TIMELINE: protocolo programado (best-effort)
                try:
                    from utils.timeline_helpers import record_timeline_event
                    await record_timeline_event(
                        patient_id=request.patient_id,
                        event_type="protocol_scheduled",
                        payload={
                            "protocol_name": protocol.get("name", "?"),
                            "start_date": start,
                        },
                    )
                except Exception:
                    pass

            # 🟢 LOG: Protocolo ativado
            log_operation(
                action="activate_protocol",
                status="success",
                actor_user_id=current_user.user_id,
                target_user_id=request.patient_id,
                route="/api/professional/protocols/activate",
                extra_data={
                    "protocol_name": protocol.get('name'),
                    "duration_days": duration,
                    "tasks_injected": sync_result.get("injected", 0),
                }
            )

            return {
                "success": True,
                "patient_protocol": patient_protocol,
                "status": proto_status,
                "tasks_injected": sync_result.get("injected", 0),
                "tasks_skipped": sync_result.get("skipped", 0),
                "message": (
                    f"Protocolo '{protocol.get('name')}' programado para {start}. "
                    f"As tarefas serão adicionadas ao checklist na data de início."
                ) if proto_status == "scheduled" else (
                    f"Protocolo '{protocol.get('name')}' ativado. "
                    f"{sync_result.get('injected', 0)} tarefa(s) adicionada(s) ao checklist do paciente."
                ),
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao ativar protocolo: {e}")
        
        log_operation(
            action="activate_protocol",
            status="error",
            actor_user_id=current_user.user_id,
            target_user_id=request.patient_id,
            route="/api/professional/protocols/activate",
            error_detail=str(e)
        )
        
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/professional/protocols/deactivate/{patient_protocol_id}")
async def deactivate_protocol(
    patient_protocol_id: str,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Desativa um protocolo de um paciente.
    
    Requer: role=professional ou admin
    """
    if current_user.app_role not in ["professional", "admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Atualizar status para paused
            update_resp = await client.patch(
                f"{SUPABASE_URL}/rest/v1/patient_protocols",
                headers={**_supabase_headers(), "Prefer": "return=representation"},
                params={"id": f"eq.{patient_protocol_id}"},
                json={"status": "paused"}
            )
            
            if update_resp.status_code not in [200, 204]:
                raise HTTPException(
                    status_code=400,
                    detail="Erro ao desativar protocolo"
                )
            
            # 🗑️ Remover tasks do checklist (best-effort)
            try:
                from routes.protocol_checklist import remove_protocol_tasks_from_checklist
                remove_result = await remove_protocol_tasks_from_checklist(
                    patient_protocol_id=patient_protocol_id,
                    current_user=current_user,
                )
                logger.info(f"🗑️ Auto-remove: {remove_result.get('removed', 0)} tasks removidas do checklist")
            except Exception as rm_err:
                logger.warning(f"⚠️ Auto-remove falhou (não crítico): {rm_err}")

            log_operation(
                action="deactivate_protocol",
                status="success",
                actor_user_id=current_user.user_id,
                route="/api/professional/protocols/deactivate",
                extra_data={"patient_protocol_id": patient_protocol_id}
            )
            
            return {"success": True, "message": "Protocolo desativado e tarefas removidas do checklist"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao desativar protocolo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/professional/patients/{patient_id}/promote-scheduled-protocols
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/professional/patients/{patient_id}/promote-scheduled-protocols")
async def promote_scheduled_protocols(
    patient_id: str,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Verifica e promove protocolos programados vencidos de um paciente.

    - Requer: role = professional | admin
    - Busca patient_protocols com status='scheduled' e start_date <= hoje
    - Promove cada um para status='active'
    - Executa sync de tasks para cada protocolo promovido
    - Idempotente: filtra apenas 'scheduled', impossível reativar um já 'active'
    """
    if current_user.app_role not in ("professional", "admin"):
        raise HTTPException(status_code=403, detail="Acesso negado: requer professional ou admin")

    today = date.today().isoformat()
    promoted_list = []
    total_injected = 0

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:

            # 1. Buscar protocolos programados vencidos
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/patient_protocols",
                headers=_supabase_headers(),
                params={
                    "patient_id": f"eq.{patient_id}",
                    "status":     "eq.scheduled",
                    "start_date": f"lte.{today}",
                    "select":     "id,protocol_id,protocols(name)",
                },
            )

            if resp.status_code != 200:
                logger.warning(f"⚠️ promote-scheduled: falha ao consultar patient_protocols: {resp.status_code}")
                return {"promoted": 0, "tasks_injected": 0, "promoted_protocols": [], "message": "OK (erro ao consultar)"}

            due = resp.json()

            if not due:
                return {"promoted": 0, "tasks_injected": 0, "promoted_protocols": [], "message": "OK (nenhum protocolo no vencimento)"}

            # 2. Promover cada um para active e sincronizar tasks
            for pp in due:
                protocol_name = (pp.get("protocols") or {}).get("name", "?")

                # PATCH status='scheduled' → 'active'
                patch = await client.patch(
                    f"{SUPABASE_URL}/rest/v1/patient_protocols",
                    headers={**_supabase_headers(), "Prefer": "return=minimal"},
                    params={"id": f"eq.{pp['id']}"},
                    json={"status": "active"},
                )

                if patch.status_code not in (200, 204):
                    logger.warning(f"⚠️ promote-scheduled: falha ao promover {pp['id']}: {patch.status_code}")
                    continue

                logger.info(
                    f"📅→✅ '{protocol_name}' promovido scheduled→active "
                    f"(patient: {patient_id}, professional: {current_user.user_id})"
                )

                # 📅 TIMELINE: protocolo promovido scheduled→active (best-effort)
                try:
                    from utils.timeline_helpers import record_timeline_event
                    await record_timeline_event(
                        patient_id=patient_id,
                        event_type="protocol_activated",
                        payload={"protocol_name": protocol_name},
                    )
                except Exception:
                    pass

                # Sync de tasks (best-effort — não bloqueia em caso de falha)
                injected = 0
                try:
                    from routes.protocol_checklist import sync_protocol_tasks_to_checklist
                    sync_result = await sync_protocol_tasks_to_checklist(
                        patient_protocol_id=pp["id"],
                        current_user=current_user,
                    )
                    injected = sync_result.get("injected", 0)
                    total_injected += injected
                except Exception as sync_err:
                    logger.warning(f"⚠️ Sync pós-promoção falhou para {pp['id']}: {sync_err}")

                promoted_list.append({
                    "patient_protocol_id": pp["id"],
                    "protocol_name": protocol_name,
                    "tasks_injected": injected,
                })

        return {
            "promoted": len(promoted_list),
            "tasks_injected": total_injected,
            "promoted_protocols": promoted_list,
            "message": (
                f"OK ({len(promoted_list)} promovido(s), {total_injected} task(s) injetada(s))"
                if promoted_list else
                "OK (nenhum protocolo no vencimento)"
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ promote-scheduled error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        async with httpx.AsyncClient() as client:
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
        async with httpx.AsyncClient() as client:
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
        async with httpx.AsyncClient() as client:
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
            
            # Calcular datas
            start = request.start_date or date.today().isoformat()
            duration = request.duration_days or protocol.get('default_duration_days', 30)
            end = (date.fromisoformat(start) + timedelta(days=duration)).isoformat()
            
            # Criar patient_protocol
            pp_resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/patient_protocols",
                headers={**_supabase_headers(), "Prefer": "return=representation"},
                json={
                    "patient_id": request.patient_id,
                    "protocol_id": request.protocol_id,
                    "org_id": current_user.user_id,  # professional_id
                    "status": "active",
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
            
            # 🟢 LOG: Protocolo ativado
            log_operation(
                action="activate_protocol",
                status="success",
                actor_user_id=current_user.user_id,
                target_user_id=request.patient_id,
                route="/api/professional/protocols/activate",
                extra_data={
                    "protocol_name": protocol.get('name'),
                    "duration_days": duration
                }
            )
            
            return {
                "success": True,
                "patient_protocol": patient_protocol,
                "message": f"Protocolo '{protocol.get('name')}' ativado para o paciente"
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
        async with httpx.AsyncClient() as client:
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
            
            log_operation(
                action="deactivate_protocol",
                status="success",
                actor_user_id=current_user.user_id,
                route="/api/professional/protocols/deactivate",
                extra_data={"patient_protocol_id": patient_protocol_id}
            )
            
            return {"success": True, "message": "Protocolo desativado"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao desativar protocolo: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ─────────────────────────────────────────────────────────────────────────────
# GERENCIAMENTO DE PROTOCOLOS (catálogo editável)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/professional/protocols")
async def list_protocols(
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Lista todos os protocolos disponíveis no catálogo.
    Sempre retorna a lista completa — editável a qualquer momento.

    Requer: role=professional ou admin
    """
    if current_user.app_role not in ["professional", "admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/protocols",
                headers=_supabase_headers(),
                params={"select": "id,name,category,description,instructions,default_duration_days,created_at", "order": "created_at.asc"},
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail="Erro ao buscar protocolos")

            return {"protocols": resp.json()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao listar protocolos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/professional/patients/{patient_id}/protocols")
async def list_patient_protocols(
    patient_id: str,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Lista todos os patient_protocols de um paciente (todos os status).
    Permite ao profissional ver o histórico completo.

    Requer: role=professional ou admin
    """
    if current_user.app_role not in ["professional", "admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/patient_protocols",
                headers=_supabase_headers(),
                params={
                    "patient_id": f"eq.{patient_id}",
                    "select": "id,status,start_date,end_date,progress_day,created_at,updated_at,protocol_id,protocols(id,name,category,description,default_duration_days)",
                    "order": "created_at.desc",
                },
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail="Erro ao buscar protocolos do paciente")

            return {"patient_protocols": resp.json()}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao listar protocolos do paciente: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/professional/protocols")
async def create_protocol(
    request: CreateProtocolRequest,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Cria um novo protocolo no catálogo.
    O catálogo é sempre editável — protocolos podem ser adicionados a qualquer momento.

    Requer: role=professional ou admin
    """
    if current_user.app_role not in ["professional", "admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")

    if not request.name or not request.name.strip():
        raise HTTPException(status_code=400, detail="Nome do protocolo é obrigatório")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/protocols",
                headers={**_supabase_headers(), "Prefer": "return=representation"},
                json={
                    "name": request.name.strip(),
                    "category": request.category,
                    "description": request.description,
                    "instructions": request.instructions,
                    "default_duration_days": request.default_duration_days or 30,
                },
            )
            if resp.status_code not in [200, 201]:
                detail = resp.json() if resp.content else "Erro ao criar protocolo"
                raise HTTPException(status_code=400, detail=str(detail))

            created = resp.json()
            protocol = created[0] if isinstance(created, list) else created

            log_operation(
                action="create_protocol",
                status="success",
                actor_user_id=current_user.user_id,
                route="/api/professional/protocols",
                extra_data={"protocol_name": request.name},
            )

            return {"success": True, "protocol": protocol}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao criar protocolo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/professional/protocols/{protocol_id}")
async def update_protocol(
    protocol_id: str,
    request: UpdateProtocolRequest,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Atualiza um protocolo existente no catálogo.

    Requer: role=professional ou admin
    """
    if current_user.app_role not in ["professional", "admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")

    # Construir payload com apenas os campos enviados
    payload = {k: v for k, v in request.model_dump().items() if v is not None and k != "tasks"}

    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"{SUPABASE_URL}/rest/v1/protocols",
                headers={**_supabase_headers(), "Prefer": "return=representation"},
                params={"id": f"eq.{protocol_id}"},
                json=payload,
            )
            if resp.status_code not in [200, 204]:
                detail = resp.json() if resp.content else "Erro ao atualizar protocolo"
                raise HTTPException(status_code=400, detail=str(detail))

            updated = resp.json()
            protocol = (updated[0] if isinstance(updated, list) and updated else updated) or {"id": protocol_id}

            log_operation(
                action="update_protocol",
                status="success",
                actor_user_id=current_user.user_id,
                route=f"/api/professional/protocols/{protocol_id}",
            )

            return {"success": True, "protocol": protocol}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao atualizar protocolo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/professional/protocols/{protocol_id}")
async def delete_protocol(
    protocol_id: str,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Remove um protocolo do catálogo.
    Não remove patient_protocols existentes — apenas impede novas ativações.

    Requer: role=professional ou admin
    """
    if current_user.app_role not in ["professional", "admin"]:
        raise HTTPException(status_code=403, detail="Acesso negado")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{SUPABASE_URL}/rest/v1/protocols",
                headers=_supabase_headers(),
                params={"id": f"eq.{protocol_id}"},
            )
            if resp.status_code not in [200, 204]:
                raise HTTPException(status_code=400, detail="Erro ao excluir protocolo")

            log_operation(
                action="delete_protocol",
                status="success",
                actor_user_id=current_user.user_id,
                route=f"/api/professional/protocols/{protocol_id}",
                extra_data={"protocol_id": protocol_id},
            )

            return {"success": True, "message": "Protocolo removido do catálogo"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao excluir protocolo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

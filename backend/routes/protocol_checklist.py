"""
Protocol → Checklist Integration
=================================
Sincroniza protocol_tasks com checklist_tasks do paciente.

Endpoints:
  GET  /api/professional/protocols/list
        Lista todos os protocolos disponíveis (name, category, tasks count)

  GET  /api/professional/patients/{patient_id}/active-protocols
        Lista patient_protocols ativos de um paciente (para o profissional ver)

  POST /api/professional/protocols/{patient_protocol_id}/sync-tasks
        Injeta as protocol_tasks no checklist_tasks do paciente.
        Idempotente: não duplica se já existir.

  DELETE /api/professional/protocols/{patient_protocol_id}/sync-tasks
        Remove do checklist_tasks as tarefas geradas por este protocolo.

Anti-duplicação:
  1. Preferencial: coluna protocol_task_id (índice único por patient_id)
  2. Fallback: título com marcador "[🎯 NomeProtocolo]" se colunas não existirem ainda
"""

from fastapi import APIRouter, HTTPException, Depends
import os
import httpx
import logging
from security.auth import get_current_user_with_db_role, CurrentUser
from utils.structured_logger import log_operation

logger = logging.getLogger(__name__)

router = APIRouter(tags=["protocol-checklist"])

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _h() -> dict:
    return {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
    }


def _require_professional_or_admin(current_user: CurrentUser):
    if current_user.app_role not in ("professional", "admin"):
        raise HTTPException(status_code=403, detail="Acesso negado: requer professional ou admin")


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/professional/protocols/list
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/professional/protocols/list")
async def list_protocols(
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """Lista todos os protocolos disponíveis com contagem de tasks."""
    _require_professional_or_admin(current_user)

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Buscar protocolos
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/protocols",
            headers=_h(),
            params={"select": "id,name,category,description,default_duration_days", "order": "name.asc"},
        )

        if resp.status_code != 200:
            logger.error(f"Erro ao buscar protocols: {resp.status_code} {resp.text[:200]}")
            raise HTTPException(status_code=500, detail="Erro ao buscar protocolos")

        protocols = resp.json()

        # Para cada protocolo, contar tasks
        enriched = []
        for p in protocols:
            tasks_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/protocol_tasks",
                headers=_h(),
                params={"protocol_id": f"eq.{p['id']}", "select": "id"},
            )
            task_count = len(tasks_resp.json()) if tasks_resp.status_code == 200 else 0
            enriched.append({**p, "task_count": task_count})

    return {"protocols": enriched}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/professional/patients/{patient_id}/active-protocols
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/professional/patients/{patient_id}/active-protocols")
async def get_patient_active_protocols(
    patient_id: str,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """Retorna protocolos ativos de um paciente (visão do profissional)."""
    _require_professional_or_admin(current_user)

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/patient_protocols",
            headers=_h(),
            params={
                "patient_id": f"eq.{patient_id}",
                "select": "id,protocol_id,status,start_date,end_date,progress_day,protocols(id,name,category)",
                "order": "created_at.desc",
            },
        )

        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Erro ao buscar protocolos do paciente")

        data = resp.json()

        # Contar tasks injetadas no checklist para cada patient_protocol
        result = []
        for pp in data:
            # Contar checklist_tasks derivadas deste patient_protocol
            checklist_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/checklist_tasks",
                headers=_h(),
                params={
                    "patient_id": f"eq.{patient_id}",
                    "patient_protocol_id": f"eq.{pp['id']}",
                    "select": "id",
                },
            )
            injected_count = len(checklist_resp.json()) if checklist_resp.status_code == 200 else 0

            protocol_info = pp.get("protocols") or {}
            result.append({
                "id": pp["id"],
                "protocol_id": pp["protocol_id"],
                "protocol_name": protocol_info.get("name", "?"),
                "protocol_category": protocol_info.get("category"),
                "status": pp["status"],
                "start_date": pp.get("start_date"),
                "end_date": pp.get("end_date"),
                "progress_day": pp.get("progress_day", 0),
                "injected_tasks": injected_count,
            })

    return {"patient_protocols": result}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/professional/protocols/{patient_protocol_id}/sync-tasks
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/professional/protocols/{patient_protocol_id}/sync-tasks")
async def sync_protocol_tasks_to_checklist(
    patient_protocol_id: str,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Injeta as protocol_tasks no checklist_tasks do paciente.

    Anti-duplicação (duas camadas):
      1. Se coluna protocol_task_id existir → usa índice único (upsert ignore)
      2. Fallback → verifica por título marcado '[🎯 NomeProtocolo] Título'

    Retorna: { injected: N, skipped: N, tasks: [...] }
    """
    _require_professional_or_admin(current_user)

    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Buscar patient_protocol
        pp_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/patient_protocols",
            headers=_h(),
            params={
                "id": f"eq.{patient_protocol_id}",
                "select": "id,patient_id,protocol_id,status,protocols(id,name,category)",
            },
        )

        if pp_resp.status_code != 200 or not pp_resp.json():
            raise HTTPException(status_code=404, detail="patient_protocol não encontrado")

        pp = pp_resp.json()[0]
        patient_id = pp["patient_id"]
        protocol_info = pp.get("protocols") or {}
        protocol_name = protocol_info.get("name", "Protocolo")

        if pp["status"] not in ("active",):
            raise HTTPException(
                status_code=400,
                detail=f"Protocolo não está ativo (status={pp['status']}). Ative antes de sincronizar."
            )

        # 2. Buscar protocol_tasks do protocolo
        pt_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/protocol_tasks",
            headers=_h(),
            params={
                "protocol_id": f"eq.{pp['protocol_id']}",
                "select": "id,title,description,day_number,order",
                "order": "day_number.asc,order.asc",
            },
        )

        if pt_resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Erro ao buscar protocol_tasks")

        protocol_tasks = pt_resp.json()
        logger.info(f"🎯 sync-tasks: {len(protocol_tasks)} protocol_tasks para protocolo '{protocol_name}'")

        # Se não houver tasks no protocolo, encerrar
        if not protocol_tasks:
            return {
                "injected": 0,
                "skipped": 0,
                "tasks": [],
                "message": f"Protocolo '{protocol_name}' não tem tasks cadastradas. Cadastre tasks no protocolo primeiro.",
            }

        # 3. Buscar checklist existente do paciente para dedup por título (fallback)
        existing_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/checklist_tasks",
            headers=_h(),
            params={"patient_id": f"eq.{patient_id}", "select": "id,title,protocol_task_id"},
        )

        existing_tasks = existing_resp.json() if existing_resp.status_code == 200 else []
        existing_protocol_task_ids = {
            t.get("protocol_task_id") for t in existing_tasks if t.get("protocol_task_id")
        }
        existing_titles = {t["title"] for t in existing_tasks}

        injected = []
        skipped = []

        for pt in protocol_tasks:
            task_title = pt.get("title", "").strip()
            if not task_title:
                continue

            pt_id = pt["id"]
            marked_title = f"[🎯 {protocol_name}] {task_title}"

            # Dedup camada 1: protocol_task_id já existe
            if pt_id in existing_protocol_task_ids:
                skipped.append(pt_id)
                logger.debug(f"   skip (protocol_task_id): {task_title}")
                continue

            # Dedup camada 2: título marcado já existe
            if marked_title in existing_titles:
                skipped.append(pt_id)
                logger.debug(f"   skip (title): {task_title}")
                continue

            # Inserir
            insert_payload = {
                "patient_id": patient_id,
                "title": marked_title,
                "completed": False,
            }

            # Tentar incluir campos extras (se existirem na tabela)
            insert_payload["source"] = "protocol"
            insert_payload["protocol_task_id"] = pt_id
            insert_payload["patient_protocol_id"] = patient_protocol_id

            insert_resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/checklist_tasks",
                headers={**_h(), "Prefer": "return=representation,resolution=ignore-duplicates"},
                json=insert_payload,
            )

            if insert_resp.status_code in (200, 201):
                injected.append(task_title)
                logger.info(f"   ✅ injetou: {task_title}")
            elif insert_resp.status_code == 409:
                # Conflito de índice único → já existe
                skipped.append(pt_id)
                logger.debug(f"   skip (409 conflict): {task_title}")
            elif insert_resp.status_code == 400:
                # Coluna source/protocol_task_id pode não existir → tentar payload mínimo
                logger.warning(f"   ⚠️ 400 com payload completo, tentando payload mínimo para: {task_title}")
                minimal_payload = {
                    "patient_id": patient_id,
                    "title": marked_title,
                    "completed": False,
                }
                retry_resp = await client.post(
                    f"{SUPABASE_URL}/rest/v1/checklist_tasks",
                    headers={**_h(), "Prefer": "return=representation"},
                    json=minimal_payload,
                )
                if retry_resp.status_code in (200, 201):
                    injected.append(task_title)
                    logger.info(f"   ✅ injetou (mínimo): {task_title}")
                else:
                    logger.error(f"   ❌ falhou mínimo {retry_resp.status_code}: {retry_resp.text[:100]}")
            else:
                logger.error(f"   ❌ erro {insert_resp.status_code}: {insert_resp.text[:100]}")

    log_operation(
        action="sync_protocol_tasks",
        status="success",
        actor_user_id=current_user.user_id,
        target_user_id=patient_id,
        route=f"/api/professional/protocols/{patient_protocol_id}/sync-tasks",
        extra_data={"injected": len(injected), "skipped": len(skipped), "protocol_name": protocol_name},
    )

    return {
        "injected": len(injected),
        "skipped": len(skipped),
        "tasks": injected,
        "protocol_name": protocol_name,
        "message": f"✅ {len(injected)} tarefa(s) adicionada(s) ao checklist, {len(skipped)} já existiam.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/professional/protocols/{patient_protocol_id}/sync-tasks
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/professional/protocols/{patient_protocol_id}/sync-tasks")
async def remove_protocol_tasks_from_checklist(
    patient_protocol_id: str,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Remove do checklist_tasks as tarefas geradas por este protocolo.

    Estratégia dupla:
      1. Delete por patient_protocol_id (se coluna existir)
      2. Fallback: delete por título '[🎯 NomeProtocolo] ...'
    """
    _require_professional_or_admin(current_user)

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Buscar patient_protocol
        pp_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/patient_protocols",
            headers=_h(),
            params={
                "id": f"eq.{patient_protocol_id}",
                "select": "id,patient_id,protocols(name)",
            },
        )

        if pp_resp.status_code != 200 or not pp_resp.json():
            raise HTTPException(status_code=404, detail="patient_protocol não encontrado")

        pp = pp_resp.json()[0]
        patient_id = pp["patient_id"]
        protocol_name = (pp.get("protocols") or {}).get("name", "")

        removed_count = 0

        # Estratégia 1: delete por patient_protocol_id
        del_resp = await client.delete(
            f"{SUPABASE_URL}/rest/v1/checklist_tasks",
            headers={**_h(), "Prefer": "return=representation"},
            params={
                "patient_id": f"eq.{patient_id}",
                "patient_protocol_id": f"eq.{patient_protocol_id}",
            },
        )

        if del_resp.status_code in (200, 204):
            removed_by_col = del_resp.json() if del_resp.status_code == 200 else []
            removed_count += len(removed_by_col)
            logger.info(f"🗑️ Removeu {len(removed_by_col)} tasks via patient_protocol_id")

        # Estratégia 2 (fallback): delete por prefixo de título
        if protocol_name:
            prefix = f"[🎯 {protocol_name}]"
            # Buscar tasks com esse prefixo
            find_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/checklist_tasks",
                headers=_h(),
                params={
                    "patient_id": f"eq.{patient_id}",
                    "title": f"like.{prefix}%",
                    "select": "id",
                },
            )
            if find_resp.status_code == 200 and find_resp.json():
                ids_to_del = [t["id"] for t in find_resp.json()]
                for tid in ids_to_del:
                    dr = await client.delete(
                        f"{SUPABASE_URL}/rest/v1/checklist_tasks",
                        headers=_h(),
                        params={"id": f"eq.{tid}"},
                    )
                    if dr.status_code in (200, 204):
                        removed_count += 1

    log_operation(
        action="remove_protocol_tasks",
        status="success",
        actor_user_id=current_user.user_id,
        target_user_id=patient_id,
        route=f"/api/professional/protocols/{patient_protocol_id}/sync-tasks",
        extra_data={"removed": removed_count, "protocol_name": protocol_name},
    )

    return {
        "removed": removed_count,
        "message": f"🗑️ {removed_count} tarefa(s) do protocolo removida(s) do checklist.",
    }

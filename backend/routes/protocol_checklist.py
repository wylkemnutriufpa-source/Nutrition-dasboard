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

  POST /api/patient/checklist/sync-protocols   [NOVO]
        Endpoint acessível pelo PACIENTE logado.
        Auto-sync: busca patient_protocols ativos e injeta tasks faltantes.
        Chamado automaticamente ao abrir o checklist.

Anti-duplicação:
  1. Preferencial: coluna protocol_task_id (índice único por patient_id)
  2. Fallback: título com marcador "[🎯 NomeProtocolo]" se colunas não existirem ainda
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import os
import httpx
import logging
from datetime import date
from collections import Counter
from security.auth import get_current_user_with_db_role, get_current_user, CurrentUser
from utils.structured_logger import log_operation

logger = logging.getLogger(__name__)

router = APIRouter(tags=["protocol-checklist"])


class ProtocolTaskRequest(BaseModel):
    title: str
    description: Optional[str] = None
    frequency: Optional[str] = "daily"
    order_index: Optional[int] = None
    active: Optional[bool] = True

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


def _require_patient(current_user: CurrentUser):
    if current_user.app_role != "patient":
        raise HTTPException(status_code=403, detail="Acesso negado: exclusivo para pacientes")


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
        # Query 1: buscar todos os protocolos
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/protocols",
            headers=_h(),
            params={"select": "id,name,category,description,default_duration_days", "order": "name.asc"},
        )

        if resp.status_code != 200:
            logger.error(f"Erro ao buscar protocols: {resp.status_code} {resp.text[:200]}")
            raise HTTPException(status_code=500, detail="Erro ao buscar protocolos")

        protocols = resp.json()

        if not protocols:
            return {"protocols": []}

        # Query 2 (única): buscar protocol_id de todas as tasks dos protocolos listados
        # Substitui N queries (uma por protocolo) por uma só com filtro IN
        protocol_ids = [p["id"] for p in protocols]
        tasks_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/protocol_tasks",
            headers=_h(),
            params={
                "protocol_id": f"in.({','.join(protocol_ids)})",
                "select": "protocol_id",
            },
        )

        task_counts: Counter = Counter()
        if tasks_resp.status_code == 200:
            for t in tasks_resp.json():
                pid = t.get("protocol_id")
                if pid:
                    task_counts[pid] += 1

        enriched = [{**p, "task_count": task_counts[p["id"]]} for p in protocols]

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
        # Query 1: buscar patient_protocols do paciente
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/patient_protocols",
            headers=_h(),
            params={
                "patient_id": f"eq.{patient_id}",
                "select": "id,protocol_id,status,start_date,end_date,progress_day,protocols(name,category)",
                "order": "created_at.desc",
            },
        )

        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Erro ao buscar protocolos do paciente")

        data = resp.json()

        # Query 2 (única): buscar patient_protocol_id de todas as checklist_tasks do paciente
        # Substitui N queries (uma por patient_protocol) por uma só
        ct_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/checklist_tasks",
            headers=_h(),
            params={
                "patient_id": f"eq.{patient_id}",
                "patient_protocol_id": "not.is.null",
                "select": "patient_protocol_id",
            },
        )

        injected_counts: Counter = Counter()
        if ct_resp.status_code == 200:
            for t in ct_resp.json():
                ppid = t.get("patient_protocol_id")
                if ppid:
                    injected_counts[ppid] += 1

        result = []
        for pp in data:
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
                "injected_tasks": injected_counts[pp["id"]],
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
                "select": "id,patient_id,protocol_id,status,protocols(name)",
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
                "active": "eq.true",
                "select": "id,title,description,frequency,order_index",
                "order": "order_index.asc",
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

    # 📅 TIMELINE: tasks sincronizadas (best-effort, apenas quando houve injeção real)
    if len(injected) > 0:
        try:
            from utils.timeline_helpers import record_timeline_event
            await record_timeline_event(
                patient_id=patient_id,
                event_type="protocol_tasks_synced",
                payload={
                    "protocol_name": protocol_name,
                    "tasks_injected": len(injected),
                },
            )
        except Exception:
            pass

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
        # Só executa se Strategy 1 não removeu nada (patient_protocol_id ausente ou não indexado)
        if removed_count == 0 and protocol_name:
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


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/professional/protocols/{patient_protocol_id}/tasks
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/professional/protocols/{patient_protocol_id}/tasks")
async def get_protocol_checklist_tasks(
    patient_protocol_id: str,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Retorna as checklist_tasks vinculadas a um patient_protocol específico.

    Estratégia dupla de busca:
      1. Por patient_protocol_id (coluna direta, se existir)
      2. Fallback: por título com marcador '[🎯 NomeProtocolo]'

    Retorna: { tasks: [...], protocol_name, total, completed }
    """
    _require_professional_or_admin(current_user)

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Buscar patient_protocol para obter patient_id e nome do protocolo
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

        tasks = []

        # Estratégia 1: busca por patient_protocol_id (mais precisa)
        tasks_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/checklist_tasks",
            headers=_h(),
            params={
                "patient_id": f"eq.{patient_id}",
                "patient_protocol_id": f"eq.{patient_protocol_id}",
                "select": "id,title,completed,updated_at,created_at,source,patient_protocol_id",
                "order": "created_at.asc",
            },
        )

        if tasks_resp.status_code == 200 and tasks_resp.json():
            tasks = tasks_resp.json()
        elif protocol_name:
            # Estratégia 2: fallback por marcador no título
            marker = f"[🎯 {protocol_name}]"
            tasks_fallback = await client.get(
                f"{SUPABASE_URL}/rest/v1/checklist_tasks",
                headers=_h(),
                params={
                    "patient_id": f"eq.{patient_id}",
                    "title": f"like.{marker}%",
                    "select": "id,title,completed,updated_at,created_at,source,patient_protocol_id",
                    "order": "created_at.asc",
                },
            )
            if tasks_fallback.status_code == 200:
                tasks = tasks_fallback.json()

        # Limpar título de exibição (remover marcador [🎯 NomeProtocolo] )
        import re
        marker_re = re.compile(r"^\[🎯[^\]]*\]\s*")
        for t in tasks:
            t["display_title"] = marker_re.sub("", t.get("title", "")).strip()

        completed_count = sum(1 for t in tasks if t.get("completed"))

        return {
            "tasks": tasks,
            "protocol_name": protocol_name,
            "patient_protocol_id": patient_protocol_id,
            "total": len(tasks),
            "completed": completed_count,
        }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/patient/checklist/sync-protocols
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/patient/checklist/sync-protocols")
async def patient_auto_sync_protocols(
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Auto-sync: chamado pelo paciente ao abrir o checklist.

    1. Busca patient_protocols ativos para o patient_id autenticado
    2. Para cada protocolo ativo, busca protocol_tasks
    3. Injeta tasks faltantes no checklist_tasks (idempotente, sem duplicação)
    4. Retorna contagem total de tasks injetadas

    Segurança: requer app_role = patient (verificado via profiles).
               Usa apenas o user_id do JWT (não aceita patient_id externo).
    """
    _require_patient(current_user)
    patient_id = current_user.user_id
    today = date.today().isoformat()
    total_injected = 0
    total_skipped = 0
    total_promoted = 0
    synced_protocols = []

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:

            # ── ETAPA 0: Promover protocolos programados vencidos ────────────
            # Busca patient_protocols com status='scheduled' e start_date <= hoje.
            # Uma vez promovidos para 'active', entram automaticamente na etapa 1.
            # Idempotente: o filtro status='scheduled' garante que não serão
            # processados novamente em chamadas futuras.
            sched_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/patient_protocols",
                headers=_h(),
                params={
                    "patient_id": f"eq.{patient_id}",
                    "status":     "eq.scheduled",
                    "start_date": f"lte.{today}",
                    "select":     "id,protocols(name)",
                },
            )
            due_scheduled = sched_resp.json() if sched_resp.status_code == 200 else []

            for pp in due_scheduled:
                patch_resp = await client.patch(
                    f"{SUPABASE_URL}/rest/v1/patient_protocols",
                    headers={**_h(), "Prefer": "return=minimal"},
                    params={"id": f"eq.{pp['id']}"},
                    json={"status": "active"},
                )
                if patch_resp.status_code in (200, 204):
                    total_promoted += 1
                    pname = (pp.get("protocols") or {}).get("name", "?")
                    logger.info(
                        f"📅→✅ Protocolo '{pname}' promovido scheduled→active "
                        f"(patient: {patient_id})"
                    )
                else:
                    logger.warning(
                        f"⚠️ Falha ao promover patient_protocol {pp['id']}: "
                        f"{patch_resp.status_code}"
                    )
            # ─────────────────────────────────────────────────────────────────
            # 1. Buscar patient_protocols ativos para este paciente
            pp_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/patient_protocols",
                headers=_h(),
                params={
                    "patient_id": f"eq.{patient_id}",
                    "status": "eq.active",
                    "select": "id,protocol_id,protocols(name)",
                },
            )

            if pp_resp.status_code != 200:
                logger.warning(f"⚠️ auto-sync: falha ao buscar patient_protocols: {pp_resp.status_code}")
                return {"injected": 0, "skipped": 0, "synced_protocols": [], "message": "OK (sem protocolos)"}

            active_protocols = pp_resp.json()

            if not active_protocols:
                return {"injected": 0, "skipped": 0, "synced_protocols": [], "message": "OK (sem protocolos ativos)"}

            # 2. Buscar checklist existente do paciente (para dedup global, 1 query apenas)
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

            # 3. Para cada protocolo ativo, sincronizar tasks
            for pp in active_protocols:
                protocol_info = pp.get("protocols") or {}
                protocol_name = protocol_info.get("name", "Protocolo")
                protocol_id = pp.get("protocol_id")
                patient_protocol_id = pp["id"]

                # Buscar protocol_tasks ativas
                pt_resp = await client.get(
                    f"{SUPABASE_URL}/rest/v1/protocol_tasks",
                    headers=_h(),
                    params={
                        "protocol_id": f"eq.{protocol_id}",
                        "active": "eq.true",
                        "select": "id,title,description,frequency,order_index",
                        "order": "order_index.asc",
                    },
                )

                if pt_resp.status_code != 200:
                    logger.warning(f"⚠️ auto-sync: falha ao buscar tasks do protocolo {protocol_name}")
                    continue

                protocol_tasks = pt_resp.json()
                proto_injected = 0

                for pt in protocol_tasks:
                    task_title = pt.get("title", "").strip()
                    if not task_title:
                        continue

                    pt_id = pt["id"]
                    marked_title = f"[🎯 {protocol_name}] {task_title}"

                    # Dedup camada 1: protocol_task_id
                    if pt_id in existing_protocol_task_ids:
                        total_skipped += 1
                        continue

                    # Dedup camada 2: título marcado
                    if marked_title in existing_titles:
                        total_skipped += 1
                        continue

                    # Inserir
                    insert_payload = {
                        "patient_id": patient_id,
                        "title": marked_title,
                        "completed": False,
                        "source": "protocol",
                        "protocol_task_id": pt_id,
                        "patient_protocol_id": patient_protocol_id,
                    }

                    insert_resp = await client.post(
                        f"{SUPABASE_URL}/rest/v1/checklist_tasks",
                        headers={**_h(), "Prefer": "return=representation,resolution=ignore-duplicates"},
                        json=insert_payload,
                    )

                    if insert_resp.status_code in (200, 201):
                        proto_injected += 1
                        total_injected += 1
                        # Atualizar sets de dedup para próximas iterações
                        existing_protocol_task_ids.add(pt_id)
                        existing_titles.add(marked_title)
                    elif insert_resp.status_code == 409:
                        total_skipped += 1
                    else:
                        logger.warning(f"⚠️ auto-sync insert falhou ({insert_resp.status_code}): {task_title}")

                if proto_injected > 0:
                    synced_protocols.append({"name": protocol_name, "injected": proto_injected})

        logger.info(
            f"🔄 auto-sync paciente {patient_id}: "
            f"{total_injected} injetadas, {total_skipped} já existiam, "
            f"{total_promoted} promovidas, "
            f"{len(active_protocols)} protocolo(s) ativo(s)"
        )

    except Exception as exc:
        logger.error(f"❌ auto-sync error: {exc}")
        return {"injected": 0, "skipped": 0, "promoted": 0, "synced_protocols": [], "message": "OK (erro interno, silent)"}

    return {
        "injected": total_injected,
        "skipped": total_skipped,
        "promoted": total_promoted,
        "synced_protocols": synced_protocols,
        "message": f"OK ({total_injected} sincronizadas, {total_skipped} já existiam, {total_promoted} promovidas)",
    }


# ─────────────────────────────────────────────────────────────────────────────
# GERENCIAMENTO DE protocol_tasks (catálogo)
# Garante que o profissional possa sempre adicionar/remover tasks dos protocolos
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/professional/protocols/{protocol_id}/catalog-tasks")
async def list_catalog_tasks(
    protocol_id: str,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Lista as tasks de um protocolo do catálogo.
    Requer: role=professional ou admin
    """
    _require_professional_or_admin(current_user)

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Verificar que o protocolo existe
        p_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/protocols",
            headers=_h(),
            params={"id": f"eq.{protocol_id}", "select": "id,name"},
        )
        if p_resp.status_code != 200 or not p_resp.json():
            raise HTTPException(status_code=404, detail="Protocolo não encontrado")

        protocol_name = p_resp.json()[0].get("name", "")

        # Buscar tasks
        t_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/protocol_tasks",
            headers=_h(),
            params={
                "protocol_id": f"eq.{protocol_id}",
                "select": "id,title,description,frequency,order_index,active",
                "order": "order_index.asc,created_at.asc",
            },
        )
        if t_resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Erro ao buscar tasks")

        tasks = t_resp.json()

    return {
        "protocol_id": protocol_id,
        "protocol_name": protocol_name,
        "tasks": tasks,
        "total": len(tasks),
    }


@router.post("/professional/protocols/{protocol_id}/catalog-tasks")
async def add_catalog_task(
    protocol_id: str,
    request: ProtocolTaskRequest,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Adiciona uma task ao protocolo no catálogo.
    A task será injetada no checklist de todos os pacientes que ativarem este protocolo.
    Requer: role=professional ou admin
    """
    _require_professional_or_admin(current_user)

    if not request.title or not request.title.strip():
        raise HTTPException(status_code=400, detail="Título da task é obrigatório")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Verificar protocolo
        p_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/protocols",
            headers=_h(),
            params={"id": f"eq.{protocol_id}", "select": "id,name"},
        )
        if p_resp.status_code != 200 or not p_resp.json():
            raise HTTPException(status_code=404, detail="Protocolo não encontrado")

        # Calcular próximo order_index
        order_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/protocol_tasks",
            headers=_h(),
            params={
                "protocol_id": f"eq.{protocol_id}",
                "select": "order_index",
                "order": "order_index.desc",
                "limit": "1",
            },
        )
        max_order = 0
        if order_resp.status_code == 200 and order_resp.json():
            max_order = order_resp.json()[0].get("order_index") or 0

        payload = {
            "protocol_id": protocol_id,
            "title": request.title.strip(),
            "description": request.description,
            "frequency": request.frequency or "daily",
            "order_index": request.order_index if request.order_index is not None else max_order + 1,
            "active": True,
        }

        ins_resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/protocol_tasks",
            headers={**_h(), "Prefer": "return=representation"},
            json=payload,
        )

        if ins_resp.status_code not in (200, 201):
            detail = ins_resp.json() if ins_resp.content else "Erro ao criar task"
            raise HTTPException(status_code=400, detail=str(detail))

        created = ins_resp.json()
        task = created[0] if isinstance(created, list) else created

        log_operation(
            action="add_catalog_task",
            status="success",
            actor_user_id=current_user.user_id,
            route=f"/api/professional/protocols/{protocol_id}/catalog-tasks",
            extra_data={"task_title": request.title, "protocol_id": protocol_id},
        )

    return {"success": True, "task": task}


@router.delete("/professional/protocols/{protocol_id}/catalog-tasks/{task_id}")
async def delete_catalog_task(
    protocol_id: str,
    task_id: str,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Remove uma task do protocolo no catálogo.
    Não remove tasks já injetadas no checklist de pacientes — apenas impede futuras injeções.
    Requer: role=professional ou admin
    """
    _require_professional_or_admin(current_user)

    async with httpx.AsyncClient(timeout=10.0) as client:
        del_resp = await client.delete(
            f"{SUPABASE_URL}/rest/v1/protocol_tasks",
            headers=_h(),
            params={
                "id": f"eq.{task_id}",
                "protocol_id": f"eq.{protocol_id}",  # garante que pertence ao protocolo
            },
        )
        if del_resp.status_code not in (200, 204):
            raise HTTPException(status_code=400, detail="Erro ao remover task")

        log_operation(
            action="delete_catalog_task",
            status="success",
            actor_user_id=current_user.user_id,
            route=f"/api/professional/protocols/{protocol_id}/catalog-tasks/{task_id}",
            extra_data={"task_id": task_id, "protocol_id": protocol_id},
        )

    return {"success": True, "message": "Task removida do protocolo"}


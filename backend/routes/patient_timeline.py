"""
Patient Timeline Routes
Endpoint para retornar eventos recentes de um paciente.
Agrega dados de múltiplas tabelas existentes.
"""

from fastapi import APIRouter, Depends
from security.auth import get_current_user
from datetime import datetime, timezone
import os
import httpx

router = APIRouter(prefix="/timeline", tags=["patient-timeline"])

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _headers():
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }


@router.get("/patients/{patient_id}/events")
async def get_patient_timeline(
    patient_id: str,
    limit: int = 20,
    current_user=Depends(get_current_user),
):
    """Retorna timeline de eventos recentes de um paciente."""
    h = _headers()
    events = []

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Checklist tasks (completed)
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/checklist_tasks",
            headers=h,
            params={
                "patient_id": f"eq.{patient_id}",
                "completed": "eq.true",
                "select": "id,title,updated_at",
                "order": "updated_at.desc",
                "limit": "10",
            },
        )
        if resp.status_code == 200:
            for t in resp.json():
                events.append({
                    "type": "checklist",
                    "icon": "check",
                    "title": f"Tarefa concluída: {t.get('title', '?')}",
                    "timestamp": t.get("updated_at"),
                    "color": "emerald",
                })

        # 2. Anamnesis updates
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/anamnesis",
            headers=h,
            params={
                "patient_id": f"eq.{patient_id}",
                "select": "id,status,updated_at,created_at",
                "order": "updated_at.desc",
                "limit": "1",
            },
        )
        if resp.status_code == 200:
            for a in resp.json():
                label = "Anamnese concluída" if a.get("status") == "complete" else "Anamnese atualizada"
                events.append({
                    "type": "anamnese",
                    "icon": "file",
                    "title": label,
                    "timestamp": a.get("updated_at") or a.get("created_at"),
                    "color": "blue",
                })

        # 3. Weight history
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/weight_history",
            headers=h,
            params={
                "patient_id": f"eq.{patient_id}",
                "select": "id,weight,created_at",
                "order": "created_at.desc",
                "limit": "5",
            },
        )
        if resp.status_code == 200:
            for w in resp.json():
                events.append({
                    "type": "peso",
                    "icon": "scale",
                    "title": f"Peso atualizado: {w.get('weight', '?')} kg",
                    "timestamp": w.get("created_at"),
                    "color": "indigo",
                })

        # 4. Feedback
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/patient_feedbacks",
            headers=h,
            params={
                "patient_id": f"eq.{patient_id}",
                "select": "id,created_at",
                "order": "created_at.desc",
                "limit": "5",
            },
        )
        if resp.status_code == 200:
            for f in resp.json():
                events.append({
                    "type": "feedback",
                    "icon": "message",
                    "title": "Feedback enviado",
                    "timestamp": f.get("created_at"),
                    "color": "violet",
                })

        # 5. Progress photos
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/progress_photos",
            headers=h,
            params={
                "patient_id": f"eq.{patient_id}",
                "select": "id,created_at",
                "order": "created_at.desc",
                "limit": "5",
            },
        )
        if resp.status_code == 200:
            for p in resp.json():
                events.append({
                    "type": "foto",
                    "icon": "image",
                    "title": "Foto de progresso enviada",
                    "timestamp": p.get("created_at"),
                    "color": "teal",
                })

        # 6. Protocols — scheduled, activated (promoted) and tasks synced
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/patient_protocols",
            headers=h,
            params={
                "patient_id": f"eq.{patient_id}",
                "select": "id,status,created_at,updated_at,protocol_id,protocols(id,name,category,default_duration_days)",
                "order": "created_at.desc",
                "limit": "10",
            },
        )
        if resp.status_code == 200:
            for pr in resp.json():
                protocol_info = pr.get("protocols") or {}
                protocol_name = protocol_info.get("name") or f"Protocolo #{pr.get('protocol_id', '?')[:6]}"
                status = pr.get("status", "")
                created_at = pr.get("created_at")
                updated_at = pr.get("updated_at")

                # Determine if it was promoted (updated_at differs from created_at)
                was_promoted = (
                    updated_at
                    and created_at
                    and updated_at[:19] != created_at[:19]
                )

                if status == "scheduled":
                    events.append({
                        "type": "protocolo_programado",
                        "icon": "calendar",
                        "title": f"Protocolo programado: {protocol_name}",
                        "timestamp": created_at,
                        "color": "orange",
                    })
                elif status == "active":
                    if was_promoted:
                        # Promoção: usar updated_at como momento da ativação
                        events.append({
                            "type": "protocolo_ativado",
                            "icon": "target",
                            "title": f"Protocolo ativado: {protocol_name}",
                            "timestamp": updated_at,
                            "color": "emerald",
                        })
                    else:
                        # Criado direto como active
                        events.append({
                            "type": "protocolo_ativado",
                            "icon": "target",
                            "title": f"Protocolo iniciado: {protocol_name}",
                            "timestamp": created_at,
                            "color": "emerald",
                        })

                    # Buscar tasks do protocolo e registrar evento de sincronização
                    tasks_resp = await client.get(
                        f"{SUPABASE_URL}/rest/v1/protocol_tasks",
                        headers=h,
                        params={
                            "protocol_id": f"eq.{pr.get('protocol_id')}",
                            "select": "id",
                        },
                    )
                    if tasks_resp.status_code == 200:
                        task_count = len(tasks_resp.json())
                        if task_count > 0:
                            events.append({
                                "type": "protocolo_tasks",
                                "icon": "list",
                                "title": f"{task_count} {'tarefa' if task_count == 1 else 'tarefas'} do protocolo '{protocol_name}' disponíveis",
                                "timestamp": updated_at or created_at,
                                "color": "teal",
                            })

                elif status == "paused":
                    events.append({
                        "type": "protocolo_pausado",
                        "icon": "pause",
                        "title": f"Protocolo pausado: {protocol_name}",
                        "timestamp": updated_at or created_at,
                        "color": "gray",
                    })
                elif status == "completed":
                    events.append({
                        "type": "protocolo_concluido",
                        "icon": "check",
                        "title": f"Protocolo concluído: {protocol_name}",
                        "timestamp": updated_at or created_at,
                        "color": "blue",
                    })

        # 7. Notifications (as system events)
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/notifications",
            headers=h,
            params={
                "user_id": f"eq.{patient_id}",
                "select": "id,type,title,created_at",
                "order": "created_at.desc",
                "limit": "5",
            },
        )
        if resp.status_code == 200:
            for n in resp.json():
                events.append({
                    "type": "notificacao",
                    "icon": "bell",
                    "title": n.get("title", "Notificação"),
                    "timestamp": n.get("created_at"),
                    "color": "gray",
                })

        # 8. Patient profile creation
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/patient_profiles",
            headers=h,
            params={
                "patient_id": f"eq.{patient_id}",
                "select": "created_at",
                "limit": "1",
            },
        )
        if resp.status_code == 200:
            for pp in resp.json():
                events.append({
                    "type": "cadastro",
                    "icon": "user",
                    "title": "Paciente cadastrado no sistema",
                    "timestamp": pp.get("created_at"),
                    "color": "green",
                })

    # Sort by timestamp desc, limit
    def sort_key(e):
        ts = e.get("timestamp")
        if not ts:
            return ""
        return ts

    events.sort(key=sort_key, reverse=True)
    return {"events": events[:limit], "total": len(events)}

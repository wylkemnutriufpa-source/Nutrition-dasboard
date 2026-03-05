"""
Automation Engine – action executor.

Supported action types (MVP)
────────────────────────────
  notify_user          → INSERT INTO public.notifications  (user_id = patient)
  notify_professional  → INSERT INTO public.notifications  (user_id = professional)
  create_task          → INSERT INTO public.tasks

Each action dict comes from rule.actions[] and may contain {token} placeholders
that are resolved via templates.render_dict() before insertion.

Action schema examples
──────────────────────
notify_user / notify_professional:
  {
    "type": "notify_user",
    "user_id": "{patient_id}",     ← resolved from context
    "title": "Lembrete",
    "body": "Você ficou {inactive_days} dias sem registrar.",
    "meta": { "rule_id": "{rule_id}" }
  }

create_task:
  {
    "type": "create_task",
    "patient_id": "{patient_id}",
    "assigned_to_user_id": "{professional_id}",
    "task_type": "follow_up",
    "title": "Contato com paciente inativo",
    "details": "Paciente sem registro há {inactive_days} dias.",
    "due_at": null
  }
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from .templates import render_dict
from .types import ActionContext, ActionType

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_context(ctx: ActionContext) -> Dict[str, Any]:
    """
    Merge event + rule info into a flat context dict for template rendering.
    """
    return {
        "event_id":    ctx.event.id,
        "org_id":      ctx.event.org_id,
        "patient_id":  ctx.event.patient_id or "",
        "rule_id":     ctx.rule.id,
        "rule_name":   ctx.rule.name,
        **ctx.payload,          # all payload fields exposed at top level
        "payload":     ctx.payload,
    }


async def _insert_row(
    client: httpx.AsyncClient,
    supabase_url: str,
    service_role_key: str,
    table: str,
    row: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    INSERT a single row into a Supabase table and return the created record.
    """
    headers = {
        "apikey":        service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
    }
    resp = await client.post(
        f"{supabase_url}/rest/v1/{table}",
        headers=headers,
        json=row,
        timeout=15.0,
    )
    if resp.status_code in (200, 201):
        data = resp.json()
        return data[0] if isinstance(data, list) else data
    logger.error("INSERT %s failed %d: %s", table, resp.status_code, resp.text[:300])
    return None


async def execute_actions(
    supabase_url: str,
    service_role_key: str,
    actions: List[Dict[str, Any]],
    ctx: ActionContext,
) -> List[Dict[str, Any]]:
    """
    Execute all actions for a matched rule.

    Returns a list of output dicts (one per action), e.g.:
      [{"action": "notify_user", "record_id": "uuid-...", "ok": True}, ...]
    """
    if not actions:
        return []

    template_ctx = _build_context(ctx)
    outputs: List[Dict[str, Any]] = []

    async with httpx.AsyncClient() as client:
        for raw_action in actions:
            # Render templates inside the action dict
            action = render_dict(raw_action, template_ctx)
            action_type = action.get("type", "")

            try:
                if action_type in (ActionType.NOTIFY_USER, ActionType.NOTIFY_PROFESSIONAL):
                    result = await _action_notify(
                        client, supabase_url, service_role_key, action, ctx
                    )
                elif action_type == ActionType.CREATE_TASK:
                    result = await _action_create_task(
                        client, supabase_url, service_role_key, action, ctx
                    )
                else:
                    logger.warning("Unknown action type '%s' – skipping", action_type)
                    result = {"action": action_type, "ok": False, "error": "unknown action type"}

                outputs.append(result)

            except Exception as exc:
                logger.error("Action '%s' raised: %s", action_type, exc)
                outputs.append({"action": action_type, "ok": False, "error": str(exc)})

    return outputs


# ─────────────────────────────────────────────────────────────
# Individual action handlers
# ─────────────────────────────────────────────────────────────

async def _action_notify(
    client: httpx.AsyncClient,
    supabase_url: str,
    service_role_key: str,
    action: Dict[str, Any],
    ctx: ActionContext,
) -> Dict[str, Any]:
    """
    Create a notification row.  Works for both notify_user and
    notify_professional – the difference is which user_id is targeted.
    """
    user_id = action.get("user_id") or ""
    if not user_id:
        return {
            "action": action.get("type"),
            "ok": False,
            "error": "user_id is required for notification actions",
        }

    row = {
        "id":         str(uuid.uuid4()),
        "org_id":     action.get("org_id") or ctx.event.org_id,
        "user_id":    user_id,
        "title":      action.get("title", "Notificação automática"),
        "body":       action.get("body", ""),
        "meta":       action.get("meta") or {},
        "read":       False,
        "created_at": _now_iso(),
    }

    record = await _insert_row(
        client, supabase_url, service_role_key, "notifications", row
    )

    return {
        "action":    action.get("type"),
        "ok":        record is not None,
        "record_id": record.get("id") if record else None,
        "table":     "notifications",
    }


async def _action_create_task(
    client: httpx.AsyncClient,
    supabase_url: str,
    service_role_key: str,
    action: Dict[str, Any],
    ctx: ActionContext,
) -> Dict[str, Any]:
    """
    Create a task row.
    """
    patient_id = action.get("patient_id") or ctx.event.patient_id
    if not patient_id:
        return {
            "action": "create_task",
            "ok": False,
            "error": "patient_id is required for create_task",
        }

    row = {
        "id":                  str(uuid.uuid4()),
        "org_id":              action.get("org_id") or ctx.event.org_id,
        "patient_id":          patient_id,
        "assigned_to_user_id": action.get("assigned_to_user_id") or None,
        "type":                action.get("task_type") or action.get("type_value") or "general",
        "title":               action.get("title", "Tarefa automática"),
        "details":             action.get("details") or None,
        "due_at":              action.get("due_at") or None,
        "status":              "open",
        "created_at":          _now_iso(),
        "updated_at":          _now_iso(),
    }

    record = await _insert_row(
        client, supabase_url, service_role_key, "tasks", row
    )

    return {
        "action":    "create_task",
        "ok":        record is not None,
        "record_id": record.get("id") if record else None,
        "table":     "tasks",
    }

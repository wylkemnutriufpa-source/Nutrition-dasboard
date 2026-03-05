"""
Automation Engine – action executor.

Supported action types (MVP)
────────────────────────────
  notify_user          → INSERT INTO public.notifications  (user_id = patient)
  notify_professional  → INSERT INTO public.notifications  (user_id = professional)
  create_task          → INSERT INTO public.tasks
  create_pre_plan_draft → INSERT INTO public.meal_plan_drafts

notify_professional supports dynamic targeting via the `target` field:
  { "type": "notify_professional", "target": "org_owner" }
    → resolves user_id from org_id automatically
  { "type": "notify_professional", "target": "assigned_professional" }
    → resolves via patient → professional mapping, falls back to org_owner
  { "type": "notify_professional", "user_id": "explicit-uuid" }
    → backward compatible: uses user_id directly (target ignored)

Each action dict may contain {token} placeholders resolved via templates.render_dict().
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from .resolver import resolve_notification_target
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
                elif action_type == "create_pre_plan_draft":
                    result = await _action_create_pre_plan_draft(
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
    Create a notification row.  Works for notify_user and notify_professional.

    user_id resolution priority
    ───────────────────────────
    1. action["user_id"]  – explicit value (backward compat, highest priority)
    2. action["target"]   – dynamic:
         "org_owner"              → ctx.event.org_id (validated via profiles)
         "assigned_professional"  → patient's professional, fallback to org_owner
    3. Neither present → error logged, run marked failed.
    """
    user_id: Optional[str] = action.get("user_id") or None

    # Dynamic resolution when user_id is not explicitly provided
    if not user_id:
        target = action.get("target", "")
        if target:
            user_id = await resolve_notification_target(
                target=target,
                org_id=ctx.event.org_id,
                patient_id=ctx.event.patient_id,
                supabase_url=supabase_url,
                service_role_key=service_role_key,
            )
            if user_id:
                logger.debug(
                    "notify target='%s' resolved to user_id=%s", target, user_id
                )
            else:
                logger.warning(
                    "notify target='%s' could not be resolved (org=%s patient=%s)",
                    target, ctx.event.org_id, ctx.event.patient_id
                )

    if not user_id:
        return {
            "action": action.get("type"),
            "ok": False,
            "error": (
                "user_id could not be resolved. "
                "Provide 'user_id' or a valid 'target' (org_owner | assigned_professional)."
            ),
            "target": action.get("target"),
        }

    row = {
        "id":         str(uuid.uuid4()),
        "org_id":     action.get("org_id") or ctx.event.org_id,
        "user_id":    user_id,
        "title":      action.get("title", "Notificação automática"),
        "message":    action.get("body") or action.get("message", ""),
        "type":       action.get("notification_type", "automation"),
        "metadata":   action.get("meta") or action.get("metadata") or {},
        "is_read":    False,
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


def _resolve_due_at(action: Dict[str, Any]) -> Any:
    """
    Resolve due_at for a task.
    Supports:
      - due_at   : ISO string passed directly
      - due_in_days : int → now() + N days (e.g. due_in_days=1 → tomorrow)
    Returns None if neither is set.
    """
    if action.get("due_at"):
        return action["due_at"]
    due_in_days = action.get("due_in_days")
    if due_in_days is not None:
        try:
            days = int(due_in_days)
            return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
        except (ValueError, TypeError):
            pass
    return None


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
        "due_at":              _resolve_due_at(action),
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


def _choose_template_from_conditions(payload: Dict[str, Any]) -> str:
    """
    Deterministically choose a meal plan template based on anamnesis conditions.
    
    Priority:
      1. diabetes → "diabetes"
      2. hipertensao → "dash"
      3. renal → "renal"
      4. gastrite or refluxo → "gastrite"
      5. default → "classico_br"
    """
    conditions = payload.get("conditions_detected", [])
    restrictions = payload.get("restrictions", [])
    
    # Normalize to lowercase for matching
    all_items = []
    if isinstance(conditions, list):
        all_items.extend([str(c).lower() for c in conditions])
    if isinstance(restrictions, list):
        all_items.extend([str(r).lower() for r in restrictions])
    
    # Priority matching
    if any("diabet" in item for item in all_items):
        return "diabetes"
    if any("hipertens" in item or "pressao" in item for item in all_items):
        return "dash"
    if any("renal" in item or "rim" in item for item in all_items):
        return "renal"
    if any("gastri" in item or "reflux" in item for item in all_items):
        return "gastrite"
    
    return "classico_br"


async def _action_create_pre_plan_draft(
    client: httpx.AsyncClient,
    supabase_url: str,
    service_role_key: str,
    action: Dict[str, Any],
    ctx: ActionContext,
) -> Dict[str, Any]:
    """
    Create a pre-plan draft in meal_plan_drafts table.
    
    This draft will be picked up by the IA PLAN screen for review.
    The template is chosen deterministically based on anamnesis conditions.
    
    Schema:
      - template_key: text (chosen template name)
      - plan_json: jsonb (contains draft_type, template_key, anamnesis_snapshot, source_event_type)
      - status: text (default 'draft')
      - dedupe_key: text (daily deduplication key)
    
    Deduplication: Only one draft per patient per day (enforced by dedupe_key).
    """
    patient_id = ctx.event.patient_id
    if not patient_id:
        return {
            "action": "create_pre_plan_draft",
            "ok": False,
            "error": "patient_id is required",
        }
    
    org_id = ctx.event.org_id
    
    # Create daily dedupe key
    today_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    dedupe_key = f"pre_plan_draft:{patient_id}:{today_date}"
    
    # Check if a draft with this dedupe_key already exists
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
    }
    
    check_resp = await client.get(
        f"{supabase_url}/rest/v1/meal_plan_drafts",
        headers=headers,
        params={
            "dedupe_key": f"eq.{dedupe_key}",
            "select": "id",
            "limit": "1",
        },
        timeout=10.0,
    )
    
    if check_resp.status_code == 200:
        existing = check_resp.json()
        if existing:
            logger.info(
                f"Draft already exists for patient {patient_id} today (dedupe_key={dedupe_key}) - skipping"
            )
            return {
                "action": "create_pre_plan_draft",
                "ok": True,
                "skipped": True,
                "reason": "draft_already_exists_today",
                "existing_id": existing[0].get("id"),
                "dedupe_key": dedupe_key,
            }
    
    # Choose template based on conditions
    template_key = _choose_template_from_conditions(ctx.payload)
    
    # Build anamnesis snapshot
    anamnesis_snapshot = {
        "patient_name": ctx.payload.get("patient_name", ""),
        "conditions_detected": ctx.payload.get("conditions_detected", []),
        "restrictions": ctx.payload.get("restrictions", []),
        "goals": ctx.payload.get("goals", []),
        "weight": ctx.payload.get("weight"),
        "height": ctx.payload.get("height"),
        "age": ctx.payload.get("age"),
        "activity_level": ctx.payload.get("activity_level"),
        # Include any other relevant fields
        **{k: v for k, v in ctx.payload.items() if k not in [
            "patient_name", "conditions_detected", "restrictions", "goals",
            "weight", "height", "age", "activity_level"
        ]},
    }
    
    # Build plan_json structure
    plan_json = {
        "draft_type": "pre_plan",
        "template_key": template_key,
        "anamnesis_snapshot": anamnesis_snapshot,
        "source_event_type": ctx.event.type,
        "source_event_id": ctx.event.id,
        "generated_at": _now_iso(),
    }
    
    row = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "patient_id": patient_id,
        "template_key": template_key,
        "plan_json": plan_json,
        "status": "draft",
        "dedupe_key": dedupe_key,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    
    record = await _insert_row(
        client, supabase_url, service_role_key, "meal_plan_drafts", row
    )
    
    if record:
        logger.info(
            f"Created pre-plan draft for patient {patient_id}: "
            f"template={template_key} draft_id={record.get('id')} dedupe_key={dedupe_key}"
        )
    
    return {
        "action": "create_pre_plan_draft",
        "ok": record is not None,
        "record_id": record.get("id") if record else None,
        "table": "meal_plan_drafts",
        "template_key": template_key,
        "dedupe_key": dedupe_key,
    }

"""
Automation Engine – API routes.

Endpoints
─────────
  POST /api/admin/automation-engine/run
    Triggers one batch cycle (up to 20 pending events).

  GET  /api/admin/automation-engine/health
    Returns counts: pending events, runs last 24h, failures, events created last 24h.

  POST /api/admin/automation-engine/events/emit
    Manually emit a single event (for testing / manual triggers).

  POST /api/admin/automation-engine/detect
    Run detectors for an org and emit events for matching patients/plans.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from services.automation_engine.worker import process_automation_events
from services.automation_engine.emitter import emit_event
from services.automation_engine.detectors import run_all_detectors
from security.features import require_feature
from security.auth import get_current_user, CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/automation-engine", tags=["automation-engine"])


# ─────────────────────────────────────────────────────────────
# Config helpers
# ─────────────────────────────────────────────────────────────

def _get_config() -> tuple[str, str]:
    """
    Return (supabase_url, service_role_key).
    Raises HTTPException 503 if not configured.
    """
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_role_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Automation Engine não está configurado. "
                "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no backend .env."
            ),
        )
    return supabase_url, service_role_key


def _sb_headers(key: str) -> Dict[str, str]:
    return {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
    }


# ─────────────────────────────────────────────────────────────
# Response models
# ─────────────────────────────────────────────────────────────

class RunResponse(BaseModel):
    ok:                     bool
    processed_events:       int
    total_rules_evaluated:  int
    total_rules_triggered:  int
    total_rules_skipped:    int
    total_rules_cooldown:   int
    total_rules_failed:     int
    execution_time_ms:      int
    event_summaries:        list


class HealthResponse(BaseModel):
    ok:                      bool
    pending_events:          int
    runs_last_24h:           int
    failures_last_24h:       int
    events_created_last_24h: int
    supabase_reachable:      bool
    checked_at:              str


# ─────────────────────────────────────────────────────────────
# POST /run  – trigger one batch cycle
# ─────────────────────────────────────────────────────────────

@router.post("/run", response_model=RunResponse)
async def run_automation_engine(current_user: CurrentUser = Depends(get_current_user)):
    """
    Manually trigger the automation engine to process pending events.
    Drains up to 20 events in one call.
    
    **Requires**: Valid JWT token + feature `automations`
    """
    # 🔒 JWT Authentication + Feature enforcement
    await require_feature(current_user.user_id, "automations")
    
    supabase_url, service_role_key = _get_config()

    logger.info("🔧 Manual trigger: POST /admin/automation-engine/run (user: %s)", current_user.email or current_user.user_id)

    try:
        result = await process_automation_events(supabase_url, service_role_key)
        return RunResponse(ok=True, **result)
    except Exception as exc:
        logger.error("automation engine run error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Engine error: {exc}")


# ─────────────────────────────────────────────────────────────
# GET /health – status counters
# ─────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse)
async def automation_engine_health():
    """
    Returns live counts from the Supabase tables:
      - pending_events   : events awaiting processing
      - runs_last_24h    : total runs in the last 24 h
      - failures_last_24h: runs with status=failed in the last 24 h
    """
    supabase_url, service_role_key = _get_config()
    headers = _sb_headers(service_role_key)
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    pending_events = 0
    runs_last_24h = 0
    failures_last_24h = 0
    events_created_last_24h = 0
    reachable = False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:

            # Pending events
            r1 = await client.get(
                f"{supabase_url}/rest/v1/automation_engine_events",
                headers={**headers, "Prefer": "count=exact"},
                params={"status": "eq.pending", "select": "id"},
            )
            if r1.status_code == 200:
                reachable = True
                cr = r1.headers.get("content-range", "")
                pending_events = _parse_count(cr)

            # Total runs last 24h
            r2 = await client.get(
                f"{supabase_url}/rest/v1/automation_engine_runs",
                headers={**headers, "Prefer": "count=exact"},
                params={"started_at": f"gte.{cutoff}", "select": "id"},
            )
            if r2.status_code == 200:
                cr2 = r2.headers.get("content-range", "")
                runs_last_24h = _parse_count(cr2)

            # Failure runs last 24h
            r3 = await client.get(
                f"{supabase_url}/rest/v1/automation_engine_runs",
                headers={**headers, "Prefer": "count=exact"},
                params={
                    "status":     "eq.failed",
                    "started_at": f"gte.{cutoff}",
                    "select":     "id",
                },
            )
            if r3.status_code == 200:
                cr3 = r3.headers.get("content-range", "")
                failures_last_24h = _parse_count(cr3)

            # Events created last 24h (all statuses)
            r4 = await client.get(
                f"{supabase_url}/rest/v1/automation_engine_events",
                headers={**headers, "Prefer": "count=exact"},
                params={"created_at": f"gte.{cutoff}", "select": "id"},
            )
            if r4.status_code == 200:
                cr4 = r4.headers.get("content-range", "")
                events_created_last_24h = _parse_count(cr4)

    except Exception as exc:
        logger.error("Health check error: %s", exc)

    return HealthResponse(
        ok=reachable,
        pending_events=pending_events,
        runs_last_24h=runs_last_24h,
        failures_last_24h=failures_last_24h,
        events_created_last_24h=events_created_last_24h,
        supabase_reachable=reachable,
        checked_at=datetime.now(timezone.utc).isoformat(),
    )


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _parse_count(content_range: str) -> int:
    """
    Parse Supabase Content-Range header: "0-19/42" → 42.
    Returns 0 on any parse failure.
    """
    try:
        if "/" in content_range:
            total = content_range.split("/")[1]
            return int(total) if total != "*" else 0
    except (ValueError, IndexError):
        pass
    return 0


# ─────────────────────────────────────────────────────────────
# POST /events/emit  – manually emit a single event
# ─────────────────────────────────────────────────────────────

class EmitEventRequest(BaseModel):
    org_id:        str
    type:          str
    payload:       Dict[str, Any] = {}
    patient_id:    Optional[str]  = None
    actor_user_id: Optional[str]  = None


class EmitEventResponse(BaseModel):
    ok:       bool
    event_id: Optional[str] = None
    error:    Optional[str] = None


@router.post("/events/emit", response_model=EmitEventResponse)
async def emit_automation_event(
    body: EmitEventRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Manually emit a single automation event with status='pending'.
    Useful for testing rules without waiting for a detector to fire.

    **Requires**: Valid JWT token + feature `automations`

    Example body:
    {
      "org_id": "uuid-of-professional",
      "type": "patient.inactive_detected",
      "patient_id": "uuid-of-patient",
      "payload": { "inactive_days": 7, "patient_status": "active" }
    }
    """
    # 🔒 JWT Authentication + Feature enforcement
    await require_feature(current_user.user_id, "automations")
    
    supabase_url, service_role_key = _get_config()

    event_id = await emit_event(
        org_id=body.org_id,
        event_type=body.type,
        payload=body.payload,
        patient_id=body.patient_id,
        actor_user_id=body.actor_user_id,
        supabase_url=supabase_url,
        service_role_key=service_role_key,
    )

    if event_id:
        logger.info("Manual emit: type=%s event_id=%s (user: %s)", body.type, event_id, current_user.email)
        return EmitEventResponse(ok=True, event_id=event_id)

    return EmitEventResponse(ok=False, error="Failed to emit event – check backend logs")


# ─────────────────────────────────────────────────────────────
# POST /detect  – run detectors for an org
# ─────────────────────────────────────────────────────────────

class DetectRequest(BaseModel):
    org_id:                  str
    inactive_days_threshold: int = 5
    plan_stale_days:         int = 30


@router.post("/detect")
async def run_detectors(
    body: DetectRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Run all detectors for a given org_id.

    **Requires**: Valid JWT token + feature `automations`

    This scans the database for:
      - Inactive patients  (threshold: inactive_days_threshold days, default 5)
      - Stale active plans (threshold: plan_stale_days days, default 30)

    Emits automation_engine_events for every matching patient/plan found.
    Safe to call repeatedly – only creates new events, never deletes data.
    """
    # 🔒 JWT Authentication + Feature enforcement
    await require_feature(current_user.user_id, "automations")
    
    supabase_url, service_role_key = _get_config()

    logger.info(
        "Detect trigger: org=%s inactive_threshold=%d plan_stale=%d (user: %s)",
        body.org_id, body.inactive_days_threshold, body.plan_stale_days, current_user.email
    )

    try:
        result = await run_all_detectors(
            supabase_url=supabase_url,
            service_role_key=service_role_key,
            org_id=body.org_id,
            inactive_days_threshold=body.inactive_days_threshold,
            plan_stale_days=body.plan_stale_days,
        )
        return {"ok": True, **result}
    except Exception as exc:
        logger.error("Detect endpoint error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Detector error: {exc}")


# ─────────────────────────────────────────────────────────────
# RULES CRUD
# ─────────────────────────────────────────────────────────────

ALLOWED_ACTION_TYPES = {"notify_user", "notify_professional", "create_task"}


class RuleCreateRequest(BaseModel):
    org_id:         str
    name:           str
    trigger_type:   str
    conditions:     Dict[str, Any]       = {}
    actions:        List[Dict[str, Any]] = []
    cooldown_hours: int                  = 24
    priority:       int                  = 0
    enabled:        bool                 = True


class RulePatchRequest(BaseModel):
    name:           Optional[str]              = None
    enabled:        Optional[bool]             = None
    conditions:     Optional[Dict[str, Any]]   = None
    actions:        Optional[List[Dict[str, Any]]] = None
    cooldown_hours: Optional[int]              = None
    priority:       Optional[int]              = None
    trigger_type:   Optional[str]              = None


def _validate_rule_actions(actions: List[Dict[str, Any]]) -> Optional[str]:
    """Return an error string if any action type is invalid, else None."""
    for i, action in enumerate(actions):
        atype = action.get("type", "")
        if atype not in ALLOWED_ACTION_TYPES:
            return (
                f"Action [{i}] has invalid type '{atype}'. "
                f"Allowed: {sorted(ALLOWED_ACTION_TYPES)}"
            )
    return None


@router.get("/rules")
async def list_rules(org_id: Optional[str] = None, limit: int = 100):
    """
    List automation engine rules.
    Filter by org_id if provided.
    """
    supabase_url, service_role_key = _get_config()
    headers = {**_sb_headers(service_role_key), "Prefer": "return=representation"}  # noqa: F841
    params: Dict[str, str] = {
        "select": "*",
        "order":  "priority.desc,created_at.desc",
        "limit":  str(min(limit, 200)),
    }
    if org_id:
        params["org_id"] = f"eq.{org_id}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{supabase_url}/rest/v1/automation_engine_rules",
            headers=_sb_headers(service_role_key),
            params=params,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])

    return {"ok": True, "rules": resp.json() or [], "count": len(resp.json() or [])}


@router.post("/rules")
async def create_rule(
    body: RuleCreateRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Create a new automation engine rule.

    **Requires**: Valid JWT token + feature `automations`

    Validates:
    - name and trigger_type are required
    - actions use only allowed types: notify_user, notify_professional, create_task
    """
    # 🔒 JWT Authentication + Feature enforcement
    await require_feature(current_user.user_id, "automations")
    
    if not body.name.strip():
        raise HTTPException(status_code=422, detail="name is required")
    if not body.trigger_type.strip():
        raise HTTPException(status_code=422, detail="trigger_type is required")

    err = _validate_rule_actions(body.actions)
    if err:
        raise HTTPException(status_code=422, detail=err)

    supabase_url, service_role_key = _get_config()

    row = {
        "org_id":         body.org_id,
        "name":           body.name.strip(),
        "enabled":        body.enabled,
        "trigger_type":   body.trigger_type.strip(),
        "conditions":     body.conditions,
        "actions":        body.actions,
        "cooldown_hours": body.cooldown_hours,
        "priority":       body.priority,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{supabase_url}/rest/v1/automation_engine_rules",
            headers={**_sb_headers(service_role_key), "Prefer": "return=representation"},
            json=row,
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])

    data = resp.json()
    rule = data[0] if isinstance(data, list) else data
    logger.info("Rule created: id=%s name=%s", rule.get("id"), rule.get("name"))
    return {"ok": True, "rule": rule}


@router.patch("/rules/{rule_id}")
async def patch_rule(
    rule_id: str,
    body: RulePatchRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Partially update a rule.
    
    **Requires**: Valid JWT token + feature `automations`
    
    Supports: enable/disable, rename, update conditions/actions/cooldown/priority/trigger_type.
    """
    # 🔒 JWT Authentication + Feature enforcement
    await require_feature(current_user.user_id, "automations")
    
    if body.actions is not None:
        err = _validate_rule_actions(body.actions)
        if err:
            raise HTTPException(status_code=422, detail=err)

    # Only include fields that were explicitly provided
    updates: Dict[str, Any] = {}
    if body.name is not None:
        if not body.name.strip():
            raise HTTPException(status_code=422, detail="name cannot be empty")
        updates["name"] = body.name.strip()
    if body.enabled is not None:
        updates["enabled"] = body.enabled
    if body.trigger_type is not None:
        updates["trigger_type"] = body.trigger_type.strip()
    if body.conditions is not None:
        updates["conditions"] = body.conditions
    if body.actions is not None:
        updates["actions"] = body.actions
    if body.cooldown_hours is not None:
        updates["cooldown_hours"] = body.cooldown_hours
    if body.priority is not None:
        updates["priority"] = body.priority

    if not updates:
        raise HTTPException(status_code=422, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    supabase_url, service_role_key = _get_config()

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.patch(
            f"{supabase_url}/rest/v1/automation_engine_rules",
            headers={**_sb_headers(service_role_key), "Prefer": "return=representation"},
            params={"id": f"eq.{rule_id}"},
            json=updates,
        )

    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])

    data = resp.json()
    rule = (data[0] if isinstance(data, list) else data) if data else {"id": rule_id, **updates}
    logger.info("Rule patched: id=%s fields=%s", rule_id, list(updates.keys()))
    return {"ok": True, "rule": rule}


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Permanently delete a rule.
    
    **Requires**: Valid JWT token + feature `automations`
    """
    # 🔒 JWT Authentication + Feature enforcement
    await require_feature(current_user.user_id, "automations")
    
    supabase_url, service_role_key = _get_config()

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.delete(
            f"{supabase_url}/rest/v1/automation_engine_rules",
            headers=_sb_headers(service_role_key),
            params={"id": f"eq.{rule_id}"},
        )

    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])

    logger.info("Rule deleted: id=%s", rule_id)
    return {"ok": True, "deleted_id": rule_id}


# ─────────────────────────────────────────────────────────────
# RUNS listing
# ─────────────────────────────────────────────────────────────

@router.get("/runs")
async def list_runs(
    org_id:   Optional[str] = None,
    status:   Optional[str] = None,
    limit:    int           = 50,
):
    """
    List automation engine runs.

    Query params:
      org_id : filter by org
      status : filter by status (success|failed|skipped|cooldown)
      limit  : max rows (default 50, max 200)
    """
    supabase_url, service_role_key = _get_config()

    params: Dict[str, str] = {
        "select": "*, automation_engine_events(type,patient_id), automation_engine_rules(name,trigger_type)",
        "order":  "started_at.desc",
        "limit":  str(min(limit, 200)),
    }
    if org_id:
        params["org_id"] = f"eq.{org_id}"
    if status:
        params["status"] = f"eq.{status}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{supabase_url}/rest/v1/automation_engine_runs",
            headers=_sb_headers(service_role_key),
            params=params,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])

    runs = resp.json() or []
    return {"ok": True, "runs": runs, "count": len(runs)}

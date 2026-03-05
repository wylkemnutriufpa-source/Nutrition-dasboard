"""
Automation Engine – event emitter.

Thin helper that inserts a row into automation_engine_events with
status='pending'.  All other engine machinery (worker, evaluator, actions)
will pick it up automatically on the next run cycle.

Usage
─────
from services.automation_engine.emitter import emit_event

run_id = await emit_event(
    org_id="...",
    event_type="patient.inactive_detected",
    payload={"inactive_days": 7, "patient_status": "active"},
    patient_id="...",
)
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_supabase_config() -> tuple:
    """Return (supabase_url, service_role_key) from env."""
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    return url, key


async def emit_event(
    org_id: str,
    event_type: str,
    payload: Dict[str, Any],
    patient_id: Optional[str] = None,
    actor_user_id: Optional[str] = None,
    *,
    supabase_url: Optional[str] = None,
    service_role_key: Optional[str] = None,
) -> Optional[str]:
    """
    Insert one event into automation_engine_events with status='pending'.

    Returns the new event UUID, or None on failure.
    """
    url = supabase_url or ""
    key = service_role_key or ""
    if not url or not key:
        env_url, env_key = _get_supabase_config()
        url = url or env_url
        key = key or env_key

    if not url or not key:
        logger.error("emit_event: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured")
        return None

    event_id = str(uuid.uuid4())
    row: Dict[str, Any] = {
        "id":         event_id,
        "org_id":     org_id,
        "type":       event_type,
        "payload":    payload,
        "status":     "pending",
        "created_at": _now_iso(),
    }
    if patient_id:
        row["patient_id"] = patient_id
    if actor_user_id:
        row["actor_user_id"] = actor_user_id

    headers = {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{url}/rest/v1/automation_engine_events",
                headers=headers,
                json=row,
            )
        if resp.status_code in (200, 201):
            logger.debug(
                "Event emitted: type=%s patient=%s id=%s",
                event_type, patient_id, event_id
            )
            return event_id
        logger.error(
            "emit_event failed %d: %s (type=%s)",
            resp.status_code, resp.text[:200], event_type
        )
        return None
    except Exception as exc:
        logger.error("emit_event exception: %s", exc)
        return None


async def emit_events_batch(
    events: List[Dict[str, Any]],
    *,
    supabase_url: Optional[str] = None,
    service_role_key: Optional[str] = None,
) -> int:
    """
    Bulk-insert multiple events in one HTTP call.

    Each item must have at least: org_id, type, payload.
    Returns the number of events successfully inserted.
    """
    url = supabase_url or ""
    key = service_role_key or ""
    if not url or not key:
        env_url, env_key = _get_supabase_config()
        url = url or env_url
        key = key or env_key

    if not url or not key:
        logger.error("emit_events_batch: Supabase not configured")
        return 0

    if not events:
        return 0

    now = _now_iso()
    rows = []
    for e in events:
        row: Dict[str, Any] = {
            "id":         str(uuid.uuid4()),
            "org_id":     e["org_id"],
            "type":       e["type"],
            "payload":    e.get("payload", {}),
            "status":     e.get("status", "pending"),
            "created_at": e.get("created_at", now),
        }
        if e.get("patient_id"):
            row["patient_id"] = e["patient_id"]
        if e.get("actor_user_id"):
            row["actor_user_id"] = e["actor_user_id"]
        rows.append(row)

    headers = {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{url}/rest/v1/automation_engine_events",
                headers=headers,
                json=rows,
            )
        if resp.status_code in (200, 201):
            logger.info("Batch emitted %d events", len(rows))
            return len(rows)
        logger.error(
            "emit_events_batch failed %d: %s",
            resp.status_code, resp.text[:200]
        )
        return 0
    except Exception as exc:
        logger.error("emit_events_batch exception: %s", exc)
        return 0

"""
Automation Engine – event emitter.

Thin helper that inserts a row into automation_engine_events with
status='pending'.  All other engine machinery (worker, evaluator, actions)
will pick it up automatically on the next run cycle.

Deduplication
─────────────
Pass dedupe_key to prevent the same logical event from being inserted
more than once.  The column has a UNIQUE constraint; on conflict the
insert is silently ignored and the call still returns success.

Detectors use a daily bucket key:
  "patient.inactive_detected:{patient_id}:{YYYY-MM-DD}"
  "plan.expires_soon:{plan_id}:{YYYY-MM-DD}"

This means the detector can be called multiple times per day and will
never create duplicate pending events for the same patient/day.

Usage
─────
from services.automation_engine.emitter import emit_event, make_daily_dedupe_key

event_id = await emit_event(
    org_id="...",
    event_type="patient.inactive_detected",
    payload={"inactive_days": 7},
    patient_id="...",
    dedupe_key=make_daily_dedupe_key("patient.inactive_detected", patient_id),
)
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_supabase_config() -> tuple:
    """Return (supabase_url, service_role_key) from env."""
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    return url, key


def make_daily_dedupe_key(event_type: str, scope_id: str, bucket_date: Optional[date] = None) -> str:
    """
    Build a daily-bucket deduplication key.

    Format: "{event_type}:{scope_id}:{YYYY-MM-DD}"

    Examples
    ────────
    make_daily_dedupe_key("patient.inactive_detected", "pat-uuid")
    → "patient.inactive_detected:pat-uuid:2025-07-10"

    make_daily_dedupe_key("plan.expires_soon", "plan-uuid")
    → "plan.expires_soon:plan-uuid:2025-07-10"
    """
    today = (bucket_date or date.today()).isoformat()
    return f"{event_type}:{scope_id}:{today}"


# ─────────────────────────────────────────────────────────────
# Single event emitter
# ─────────────────────────────────────────────────────────────

async def emit_event(
    org_id: str,
    event_type: str,
    payload: Dict[str, Any],
    patient_id: Optional[str] = None,
    actor_user_id: Optional[str] = None,
    dedupe_key: Optional[str] = None,
    *,
    supabase_url: Optional[str] = None,
    service_role_key: Optional[str] = None,
) -> Optional[str]:
    """
    Insert one event into automation_engine_events with status='pending'.

    Parameters
    ──────────
    dedupe_key : optional unique key for idempotency.
                 If an event with this key already exists (status any),
                 the insert is silently ignored and the original event_id
                 is NOT returned (returns None).  Callers should treat
                 None as "already exists or error" — both are safe outcomes.

    Returns the new event UUID on insert, or None on duplicate / failure.
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
    if dedupe_key:
        row["dedupe_key"] = dedupe_key

    # Use ignore-duplicates resolution when a dedupe_key is provided
    prefer = "return=minimal,resolution=ignore-duplicates" if dedupe_key else "return=minimal"
    params = {"on_conflict": "dedupe_key"} if dedupe_key else {}

    headers = {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
        "Prefer":        prefer,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{url}/rest/v1/automation_engine_events",
                headers=headers,
                params=params,
                json=row,
            )

        if resp.status_code in (200, 201):
            logger.debug(
                "Event emitted: type=%s patient=%s id=%s dedupe=%s",
                event_type, patient_id, event_id, dedupe_key or "—",
            )
            return event_id

        logger.error(
            "emit_event failed %d: %s (type=%s dedupe=%s)",
            resp.status_code, resp.text[:200], event_type, dedupe_key,
        )
        return None

    except Exception as exc:
        logger.error("emit_event exception: %s", exc)
        return None


# ─────────────────────────────────────────────────────────────
# Batch emitter
# ─────────────────────────────────────────────────────────────

async def emit_events_batch(
    events: List[Dict[str, Any]],
    *,
    supabase_url: Optional[str] = None,
    service_role_key: Optional[str] = None,
) -> int:
    """
    Bulk-insert multiple events in one HTTP call.

    Each item must have at least: org_id, type, payload.
    Optional per-item field: dedupe_key.

    If any item in the batch has a dedupe_key the whole request uses
    resolution=ignore-duplicates so the batch is always safe to retry.

    Returns the number of rows in the batch (deduplicated rows are
    counted as success — they were already present).
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
    has_dedupe = False

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
        if e.get("dedupe_key"):
            row["dedupe_key"] = e["dedupe_key"]
            has_dedupe = True
        rows.append(row)

    prefer = (
        "return=minimal,resolution=ignore-duplicates"
        if has_dedupe
        else "return=minimal"
    )
    params = {"on_conflict": "dedupe_key"} if has_dedupe else {}

    headers = {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
        "Prefer":        prefer,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{url}/rest/v1/automation_engine_events",
                headers=headers,
                params=params,
                json=rows,
            )

        if resp.status_code in (200, 201):
            logger.info(
                "Batch emitted %d event(s) (dedupe=%s)",
                len(rows), has_dedupe
            )
            return len(rows)

        logger.error(
            "emit_events_batch failed %d: %s",
            resp.status_code, resp.text[:200],
        )
        return 0

    except Exception as exc:
        logger.error("emit_events_batch exception: %s", exc)
        return 0

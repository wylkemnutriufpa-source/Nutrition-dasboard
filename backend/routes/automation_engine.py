"""
Automation Engine – API routes.

Endpoints
─────────
  POST /api/admin/automation-engine/run
    Triggers one batch cycle (up to 20 pending events).
    Returns a JSON summary of what was processed.

  GET  /api/admin/automation-engine/health
    Returns counts: pending events, runs in last 24h, failures.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from services.automation_engine.worker import process_automation_events

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
    ok:                     bool
    pending_events:         int
    runs_last_24h:          int
    failures_last_24h:      int
    supabase_reachable:     bool
    checked_at:             str


# ─────────────────────────────────────────────────────────────
# POST /run  – trigger one batch cycle
# ─────────────────────────────────────────────────────────────

@router.post("/run", response_model=RunResponse)
async def run_automation_engine():
    """
    Manually trigger the automation engine to process pending events.
    Drains up to 20 events in one call.
    """
    supabase_url, service_role_key = _get_config()

    logger.info("🔧 Manual trigger: POST /admin/automation-engine/run")

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
                # Supabase returns count in Content-Range: 0-0/N
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

    except Exception as exc:
        logger.error("Health check error: %s", exc)

    return HealthResponse(
        ok=reachable,
        pending_events=pending_events,
        runs_last_24h=runs_last_24h,
        failures_last_24h=failures_last_24h,
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

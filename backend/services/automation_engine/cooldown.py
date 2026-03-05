"""
Automation Engine – cooldown checker.

Cooldown scope: same (org_id + rule_id + patient_id).

If there is an automation_engine_run for this combination with
status='success' within the last cooldown_hours, the rule is blocked
and a run with status='cooldown' should be recorded.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


async def is_on_cooldown(
    supabase_url: str,
    service_role_key: str,
    org_id: str,
    rule_id: str,
    patient_id: Optional[str],
    cooldown_hours: int,
) -> bool:
    """
    Returns True if the rule is still within its cooldown window for this
    org/rule/patient combination.

    patient_id = None means the rule is not patient-scoped; in that case
    cooldown is checked at org + rule level only.
    """
    if cooldown_hours <= 0:
        return False

    cutoff = datetime.now(timezone.utc) - timedelta(hours=cooldown_hours)
    cutoff_iso = cutoff.isoformat()

    # Build query: look for a successful run within the cooldown window
    params = {
        "org_id":     f"eq.{org_id}",
        "rule_id":    f"eq.{rule_id}",
        "status":     "eq.success",
        "finished_at": f"gte.{cutoff_iso}",
        "select":     "id",
        "limit":      "1",
    }

    if patient_id:
        # Also look up events that belong to this patient
        # We join via event_id → automation_engine_events.patient_id
        # Simpler: store patient_id directly in run output JSONB and filter there,
        # OR we query events that match patient_id then check runs.
        # For MVP: store patient_id in run output and filter via contains.
        # We'll do a two-step check below.
        pass

    headers = {
        "apikey":        service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type":  "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if patient_id:
                # Step 1: find event IDs for this patient within the window
                ev_resp = await client.get(
                    f"{supabase_url}/rest/v1/automation_engine_events",
                    headers=headers,
                    params={
                        "org_id":     f"eq.{org_id}",
                        "patient_id": f"eq.{patient_id}",
                        "select":     "id",
                    },
                )
                if ev_resp.status_code != 200:
                    logger.warning("Cooldown: events query failed %s", ev_resp.text)
                    return False

                events = ev_resp.json()
                if not events:
                    return False

                event_ids = [e["id"] for e in events]

                # Step 2: check if any run for these events/rule succeeded recently
                runs_resp = await client.get(
                    f"{supabase_url}/rest/v1/automation_engine_runs",
                    headers=headers,
                    params={
                        "org_id":     f"eq.{org_id}",
                        "rule_id":    f"eq.{rule_id}",
                        "status":     "eq.success",
                        "event_id":   f"in.({','.join(event_ids)})",
                        "finished_at": f"gte.{cutoff_iso}",
                        "select":     "id",
                        "limit":      "1",
                    },
                )
                if runs_resp.status_code != 200:
                    logger.warning("Cooldown: runs query failed %s", runs_resp.text)
                    return False

                runs = runs_resp.json()
                on_cd = len(runs) > 0
                if on_cd:
                    logger.debug(
                        "Cooldown HIT: rule=%s patient=%s within %dh",
                        rule_id, patient_id, cooldown_hours
                    )
                return on_cd

            else:
                # No patient scope – just org + rule
                resp = await client.get(
                    f"{supabase_url}/rest/v1/automation_engine_runs",
                    headers=headers,
                    params=params,
                )
                if resp.status_code != 200:
                    logger.warning("Cooldown: runs query failed %s", resp.text)
                    return False

                runs = resp.json()
                on_cd = len(runs) > 0
                if on_cd:
                    logger.debug(
                        "Cooldown HIT: rule=%s (no patient) within %dh",
                        rule_id, cooldown_hours
                    )
                return on_cd

    except Exception as exc:
        logger.error("Cooldown check error: %s", exc)
        return False   # fail open – don't block execution on network error

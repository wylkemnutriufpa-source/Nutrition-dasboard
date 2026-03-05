"""
Automation Engine – detectors.

Each detector scans the database for a specific condition and calls
emit_event / emit_events_batch for every patient that matches.

Detectors are purely additive: they only INSERT new events.
They never modify existing data.

─────────────────────────────────────────────────
Detector A: Patient Inactivity
  event type : "patient.inactive_detected"
  payload    : { inactive_days, patient_status, patient_name }
  trigger    : patient has no activity for >= threshold days

  Activity signals checked (in order):
    1. feedbacks.created_at       (most reliable user action)
    2. checklist_entries.date     (daily checklist completions)
    3. patient_profiles.created_at (fallback – account age)

─────────────────────────────────────────────────
Detector B: Plan Expiring Soon
  event type : "plan.expires_soon"
  payload    : { days_since_update, plan_id, plan_name, plan_status }

  NOTE: meal_plans table has NO end_date column.
  TODO: When end_date is added to meal_plans, replace the
        updated_at-based heuristic with:
          WHERE end_date BETWEEN now() AND now() + INTERVAL '{threshold} days'

  Current heuristic: active plans not updated in >= threshold days
  (signals a possibly stale / forgotten plan).

─────────────────────────────────────────────────
Detector C: Low Checklist Completion
  event type : "checklist.low_detected"
  payload    : { checklist_pct, patient_name, patient_status,
                 total_tasks, completed_tasks }
  trigger    : patient's checklist_pct < threshold_pct

  Source table: checklist_tasks
    - Count active tasks  : is_disabled IS DISTINCT FROM true
    - Count completed     : completed = true AND is_disabled IS DISTINCT FROM true
    - pct = completed / total * 100  (skip patients with 0 active tasks)
  dedupe_key  : "checklist.low_detected:{patient_id}:{YYYY-MM-DD}"
─────────────────────────────────────────────────
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from .emitter import emit_events_batch, make_daily_dedupe_key

logger = logging.getLogger(__name__)

BATCH_SIZE = 50   # max patients per detector run


# ─────────────────────────────────────────────────────────────
# Shared REST helper
# ─────────────────────────────────────────────────────────────

def _headers(key: str) -> Dict[str, str]:
    return {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
    }


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _days_since(iso_str: Optional[str]) -> Optional[int]:
    """
    Return number of whole days since *iso_str* (ISO-8601).
    Returns None if the string is missing or unparseable.
    """
    if not iso_str:
        return None
    try:
        # Supabase returns timestamps with or without 'Z' or offset
        ts = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(ts)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        delta = _now_utc() - dt
        return max(0, delta.days)
    except (ValueError, TypeError):
        return None


# ─────────────────────────────────────────────────────────────
# Detector A – Patient Inactivity
# ─────────────────────────────────────────────────────────────

async def run_inactivity_detector(
    supabase_url: str,
    service_role_key: str,
    org_id: str,
    inactive_days_threshold: int = 5,
) -> Dict[str, Any]:
    """
    Scan active patients for *org_id* and emit 'patient.inactive_detected'
    for each patient whose last known activity is >= inactive_days_threshold days ago.

    Returns a summary dict.
    """
    key = service_role_key
    headers = _headers(key)
    summary: Dict[str, Any] = {
        "detector":         "patient_inactivity",
        "org_id":           org_id,
        "threshold_days":   inactive_days_threshold,
        "patients_scanned": 0,
        "events_emitted":   0,
        "errors":           [],
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:

            # ── Step 1: Get active patients for this org ────────────────
            patients_resp = await client.get(
                f"{supabase_url}/rest/v1/patient_profiles",
                headers=headers,
                params={
                    "professional_id": f"eq.{org_id}",
                    "select":          "patient_id,created_at",
                    "order":           "created_at.asc",
                    "limit":           str(BATCH_SIZE),
                },
            )

            if patients_resp.status_code != 200:
                err = f"patients query failed {patients_resp.status_code}"
                logger.error("Inactivity detector: %s", err)
                summary["errors"].append(err)
                return summary

            patient_links = patients_resp.json() or []
            if not patient_links:
                logger.info("Inactivity detector: no patients for org=%s", org_id)
                return summary

            patient_ids = [p["patient_id"] for p in patient_links]
            link_by_id  = {p["patient_id"]: p for p in patient_links}
            summary["patients_scanned"] = len(patient_ids)

            # ── Step 2: Fetch patient profile info (name, status) ──────
            profiles_resp = await client.get(
                f"{supabase_url}/rest/v1/profiles",
                headers=headers,
                params={
                    "id":     f"in.({','.join(patient_ids)})",
                    "select": "id,name,status,updated_at",
                },
            )
            profiles = {}
            if profiles_resp.status_code == 200:
                for p in (profiles_resp.json() or []):
                    profiles[p["id"]] = p

            # ── Step 3: Fetch latest feedback per patient ──────────────
            # We query all feedbacks for the batch (one request)
            feedbacks_resp = await client.get(
                f"{supabase_url}/rest/v1/feedbacks",
                headers=headers,
                params={
                    "patient_id": f"in.({','.join(patient_ids)})",
                    "select":     "patient_id,created_at",
                    "order":      "created_at.desc",
                    "limit":      str(BATCH_SIZE * 3),  # allow multiple per patient
                },
            )
            # Keep only the most recent feedback per patient
            latest_feedback: Dict[str, str] = {}
            if feedbacks_resp.status_code == 200:
                for fb in (feedbacks_resp.json() or []):
                    pid = fb.get("patient_id")
                    if pid and pid not in latest_feedback:
                        latest_feedback[pid] = fb["created_at"]

            # ── Step 4: Fetch latest checklist entry per patient ───────
            checklist_resp = await client.get(
                f"{supabase_url}/rest/v1/checklist_entries",
                headers=headers,
                params={
                    "patient_id": f"in.({','.join(patient_ids)})",
                    "select":     "patient_id,date",
                    "order":      "date.desc",
                    "limit":      str(BATCH_SIZE * 3),
                },
            )
            latest_checklist: Dict[str, str] = {}
            if checklist_resp.status_code == 200:
                for entry in (checklist_resp.json() or []):
                    pid = entry.get("patient_id")
                    if pid and pid not in latest_checklist:
                        latest_checklist[pid] = entry["date"]

            # ── Step 5: Evaluate inactivity per patient ────────────────
            events_to_emit: List[Dict[str, Any]] = []

            for patient_id in patient_ids:
                profile = profiles.get(patient_id, {})
                patient_status = profile.get("status", "active")

                # Skip deleted/inactive profiles
                if patient_status not in ("active", None, ""):
                    continue

                # Find most recent activity signal
                activity_candidates = []

                fb_date = latest_feedback.get(patient_id)
                if fb_date:
                    activity_candidates.append(fb_date)

                cl_date = latest_checklist.get(patient_id)
                if cl_date:
                    activity_candidates.append(cl_date)

                # Fallback: use patient_profiles.created_at (account creation)
                link_created = link_by_id.get(patient_id, {}).get("created_at")
                if link_created:
                    activity_candidates.append(link_created)

                if not activity_candidates:
                    # No data at all – skip to avoid false positives
                    continue

                # Most recent activity = minimum days_since
                days_since_list = [
                    d for d in (_days_since(s) for s in activity_candidates)
                    if d is not None
                ]
                if not days_since_list:
                    continue

                days_inactive = min(days_since_list)

                if days_inactive >= inactive_days_threshold:
                    events_to_emit.append({
                        "org_id":     org_id,
                        "patient_id": patient_id,
                        "type":       "patient.inactive_detected",
                        "dedupe_key": make_daily_dedupe_key(
                            "patient.inactive_detected", patient_id
                        ),
                        "payload": {
                            "inactive_days":  days_inactive,
                            "patient_status": patient_status or "active",
                            "patient_name":   profile.get("name") or "",
                        },
                    })
                    logger.debug(
                        "Inactivity: patient=%s inactive_days=%d",
                        patient_id, days_inactive
                    )

            # ── Step 6: Emit events in one batch ───────────────────────
            if events_to_emit:
                emitted = await emit_events_batch(
                    events_to_emit,
                    supabase_url=supabase_url,
                    service_role_key=service_role_key,
                )
                summary["events_emitted"] = emitted
                logger.info(
                    "Inactivity detector: org=%s scanned=%d inactive=%d emitted=%d",
                    org_id,
                    summary["patients_scanned"],
                    len(events_to_emit),
                    emitted,
                )
            else:
                logger.info(
                    "Inactivity detector: org=%s scanned=%d — no inactive patients",
                    org_id, summary["patients_scanned"]
                )

    except Exception as exc:
        logger.error("Inactivity detector error: %s", exc)
        summary["errors"].append(str(exc))

    return summary


# ─────────────────────────────────────────────────────────────
# Detector B – Plan Expiring Soon
# ─────────────────────────────────────────────────────────────

async def run_plan_expiry_detector(
    supabase_url: str,
    service_role_key: str,
    org_id: str,
    stale_days_threshold: int = 30,
) -> Dict[str, Any]:
    """
    Detect active plans that appear stale or may be expiring soon.

    # TODO: The meal_plans table currently has NO end_date column.
    # When end_date is added, replace the updated_at heuristic with:
    #
    #   WHERE professional_id = org_id
    #   AND   is_active = true
    #   AND   end_date >= now()
    #   AND   end_date <= now() + INTERVAL '{days_threshold} days'
    #
    # And change event payload to include: { days_to_expire, plan_id, plan_name }
    #
    # Current heuristic: flag plans with is_active=true that have NOT been
    # updated in >= stale_days_threshold days (signals a possibly forgotten plan).

    Returns a summary dict.
    """
    key = service_role_key
    headers = _headers(key)
    summary: Dict[str, Any] = {
        "detector":        "plan_expiry",
        "org_id":          org_id,
        "threshold_days":  stale_days_threshold,
        "plans_scanned":   0,
        "events_emitted":  0,
        "errors":          [],
        "note": (
            "Using updated_at heuristic (no end_date column). "
            "Add end_date to meal_plans and update this detector."
        ),
    }

    cutoff_iso = (
        _now_utc() - timedelta(days=stale_days_threshold)
    ).isoformat()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:

            # Fetch active plans for org not updated since cutoff
            plans_resp = await client.get(
                f"{supabase_url}/rest/v1/meal_plans",
                headers=headers,
                params={
                    "professional_id": f"eq.{org_id}",
                    "is_active":       "eq.true",
                    "plan_status":     "eq.active",
                    "updated_at":      f"lte.{cutoff_iso}",
                    "select":          "id,patient_id,name,plan_status,updated_at",
                    "order":           "updated_at.asc",
                    "limit":           str(BATCH_SIZE),
                },
            )

            if plans_resp.status_code != 200:
                err = f"plans query failed {plans_resp.status_code}: {plans_resp.text[:100]}"
                logger.error("Plan expiry detector: %s", err)
                summary["errors"].append(err)
                return summary

            plans = plans_resp.json() or []
            summary["plans_scanned"] = len(plans)

            if not plans:
                logger.info(
                    "Plan expiry detector: org=%s — no stale plans found", org_id
                )
                return summary

            events_to_emit: List[Dict[str, Any]] = []
            for plan in plans:
                days_stale = _days_since(plan.get("updated_at")) or 0
                events_to_emit.append({
                    "org_id":     org_id,
                    "patient_id": plan.get("patient_id"),
                    "type":       "plan.expires_soon",
                    "dedupe_key": make_daily_dedupe_key(
                        "plan.expires_soon", plan["id"]
                    ),
                    "payload": {
                        # TODO: replace days_since_update with days_to_expire
                        # once end_date column is added to meal_plans
                        "days_since_update": days_stale,
                        "plan_id":           plan["id"],
                        "plan_name":         plan.get("name", ""),
                        "plan_status":       plan.get("plan_status", ""),
                        "_heuristic":        "updated_at_stale",
                    },
                })
                logger.debug(
                    "Stale plan: id=%s patient=%s days_stale=%d",
                    plan["id"], plan.get("patient_id"), days_stale
                )

            if events_to_emit:
                emitted = await emit_events_batch(
                    events_to_emit,
                    supabase_url=supabase_url,
                    service_role_key=service_role_key,
                )
                summary["events_emitted"] = emitted
                logger.info(
                    "Plan expiry detector: org=%s plans=%d emitted=%d",
                    org_id, len(plans), emitted
                )

    except Exception as exc:
        logger.error("Plan expiry detector error: %s", exc)
        summary["errors"].append(str(exc))

    return summary


# ─────────────────────────────────────────────────────────────
# Detector C – Low Checklist Completion
# ─────────────────────────────────────────────────────────────

async def detect_low_checklist(
    supabase_url: str,
    service_role_key: str,
    org_id: str,
    threshold_pct: int = 40,
) -> Dict[str, Any]:
    """
    Scan active patients for *org_id* and emit 'checklist.low_detected'
    for each patient whose checklist completion is below *threshold_pct*.

    Computation
    ───────────
    Source   : checklist_tasks
    Active   : is_disabled IS DISTINCT FROM true
    Completed: completed = true  AND  is_disabled IS DISTINCT FROM true
    pct      : round(completed / total * 100)
    Skip     : patients with 0 active tasks (no data → no event)

    Returns a summary dict.
    """
    key = service_role_key
    headers = _headers(key)
    summary: Dict[str, Any] = {
        "detector":        "checklist_low",
        "org_id":          org_id,
        "threshold_pct":   threshold_pct,
        "patients_scanned": 0,
        "events_emitted":  0,
        "errors":          [],
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:

            # ── Step 1: patients for this org ──────────────────────
            patients_resp = await client.get(
                f"{supabase_url}/rest/v1/patient_profiles",
                headers=headers,
                params={
                    "professional_id": f"eq.{org_id}",
                    "select":          "patient_id",
                    "limit":           str(BATCH_SIZE),
                },
            )
            if patients_resp.status_code != 200:
                err = f"patients query failed {patients_resp.status_code}"
                logger.error("Checklist detector: %s", err)
                summary["errors"].append(err)
                return summary

            patient_links = patients_resp.json() or []
            if not patient_links:
                logger.info("Checklist detector: no patients for org=%s", org_id)
                return summary

            patient_ids = [p["patient_id"] for p in patient_links]
            summary["patients_scanned"] = len(patient_ids)

            # ── Step 2: profile info (name, status) ────────────────
            profiles_resp = await client.get(
                f"{supabase_url}/rest/v1/profiles",
                headers=headers,
                params={
                    "id":     f"in.({','.join(patient_ids)})",
                    "select": "id,name,status",
                },
            )
            profiles: Dict[str, Dict[str, Any]] = {}
            if profiles_resp.status_code == 200:
                for p in (profiles_resp.json() or []):
                    profiles[p["id"]] = p

            # ── Step 3: fetch all active checklist tasks in one call
            tasks_resp = await client.get(
                f"{supabase_url}/rest/v1/checklist_tasks",
                headers=headers,
                params={
                    "patient_id": f"in.({','.join(patient_ids)})",
                    "is_disabled": "is.false",        # active tasks only
                    "select":      "patient_id,completed",
                    "limit":       str(BATCH_SIZE * 50),
                },
            )
            # Also fetch tasks where is_disabled IS NULL (not set)
            tasks_null_resp = await client.get(
                f"{supabase_url}/rest/v1/checklist_tasks",
                headers=headers,
                params={
                    "patient_id": f"in.({','.join(patient_ids)})",
                    "is_disabled": "is.null",
                    "select":      "patient_id,completed",
                    "limit":       str(BATCH_SIZE * 50),
                },
            )

        all_tasks: List[Dict[str, Any]] = []
        if tasks_resp.status_code == 200:
            all_tasks += tasks_resp.json() or []
        if tasks_null_resp.status_code == 200:
            all_tasks += tasks_null_resp.json() or []

        # ── Step 4: aggregate pct per patient ──────────────────────
        from collections import defaultdict
        counts: Dict[str, Dict[str, int]] = defaultdict(lambda: {"total": 0, "done": 0})
        for task in all_tasks:
            pid = task.get("patient_id")
            if not pid:
                continue
            counts[pid]["total"] += 1
            if task.get("completed"):
                counts[pid]["done"] += 1

        # ── Step 5: evaluate threshold ─────────────────────────────
        events_to_emit: List[Dict[str, Any]] = []

        for patient_id in patient_ids:
            profile = profiles.get(patient_id, {})
            patient_status = profile.get("status", "active")

            if patient_status not in ("active", None, ""):
                continue

            c = counts.get(patient_id)
            if not c or c["total"] == 0:
                # No tasks → no data → skip (avoid false positives)
                logger.debug(
                    "Checklist detector: patient=%s has no active tasks – skip",
                    patient_id
                )
                continue

            pct = round(c["done"] / c["total"] * 100)

            if pct < threshold_pct:
                events_to_emit.append({
                    "org_id":     org_id,
                    "patient_id": patient_id,
                    "type":       "checklist.low_detected",
                    "dedupe_key": make_daily_dedupe_key(
                        "checklist.low_detected", patient_id
                    ),
                    "payload": {
                        "checklist_pct":    pct,
                        "patient_name":     profile.get("name") or "",
                        "patient_status":   patient_status or "active",
                        "total_tasks":      c["total"],
                        "completed_tasks":  c["done"],
                    },
                })
                logger.debug(
                    "Checklist low: patient=%s pct=%d%% (%d/%d tasks)",
                    patient_id, pct, c["done"], c["total"]
                )

        # ── Step 6: emit in one batch ──────────────────────────────
        if events_to_emit:
            emitted = await emit_events_batch(
                events_to_emit,
                supabase_url=supabase_url,
                service_role_key=service_role_key,
            )
            summary["events_emitted"] = emitted
            logger.info(
                "Checklist detector: org=%s scanned=%d low_pct=%d emitted=%d",
                org_id, summary["patients_scanned"],
                len(events_to_emit), emitted,
            )
        else:
            logger.info(
                "Checklist detector: org=%s scanned=%d — no patients below %d%%",
                org_id, summary["patients_scanned"], threshold_pct,
            )

    except Exception as exc:
        logger.error("Checklist detector error: %s", exc)
        summary["errors"].append(str(exc))

    return summary


# ─────────────────────────────────────────────────────────────
# Convenience: run all detectors for one org
# ─────────────────────────────────────────────────────────────

async def run_all_detectors(
    supabase_url: str,
    service_role_key: str,
    org_id: str,
    inactive_days_threshold: int = 5,
    plan_stale_days: int = 30,
    checklist_threshold_pct: int = 40,
) -> Dict[str, Any]:
    """
    Run all three detectors for *org_id* and return combined summary.
    Safe to call repeatedly – detectors only emit events, never delete.
    """
    inactivity = await run_inactivity_detector(
        supabase_url, service_role_key, org_id, inactive_days_threshold
    )
    plan_expiry = await run_plan_expiry_detector(
        supabase_url, service_role_key, org_id, plan_stale_days
    )
    checklist = await detect_low_checklist(
        supabase_url, service_role_key, org_id, checklist_threshold_pct
    )
    return {
        "org_id":           org_id,
        "detectors_run":    3,
        "total_emitted": (
            inactivity["events_emitted"]
            + plan_expiry["events_emitted"]
            + checklist["events_emitted"]
        ),
        "inactivity":   inactivity,
        "plan_expiry":  plan_expiry,
        "checklist":    checklist,
    }

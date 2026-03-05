"""
Automation Engine – main worker.

process_automation_events()
────────────────────────────
1. Fetch up to 20 pending events (status='pending', ORDER BY created_at ASC).
2. Mark each event as 'processing'.
3. For each event, load matching enabled rules (trigger_type + org_id, ORDER BY priority DESC).
4. Evaluate rule conditions:
   - No match  → run(status=skipped)
   - Cooldown  → run(status=cooldown)
   - Match     → execute actions → run(status=success|failed)
5. Save an automation_engine_runs row per rule evaluated.
6. Mark event as 'done' (or 'failed' on unhandled error).
7. Return summary dict.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from .actions import execute_actions
from .cooldown import is_on_cooldown
from .evaluator import evaluate_conditions
from .types import (
    ActionContext,
    AutomationEvent,
    AutomationRule,
    EventStatus,
    RunStatus,
)

logger = logging.getLogger(__name__)

BATCH_SIZE = 20


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─────────────────────────────────────────────────────────────
# Low-level Supabase REST helpers
# ─────────────────────────────────────────────────────────────

def _headers(key: str) -> Dict[str, str]:
    return {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
    }


async def _fetch_pending_events(
    client: httpx.AsyncClient,
    supabase_url: str,
    key: str,
) -> List[Dict[str, Any]]:
    resp = await client.get(
        f"{supabase_url}/rest/v1/automation_engine_events",
        headers=_headers(key),
        params={
            "status":     "eq.pending",
            "order":      "created_at.asc",
            "limit":      str(BATCH_SIZE),
            "select":     "*",
        },
        timeout=15.0,
    )
    if resp.status_code != 200:
        logger.error("fetch_pending_events failed %d: %s", resp.status_code, resp.text[:300])
        return []
    return resp.json() or []


async def _set_event_status(
    client: httpx.AsyncClient,
    supabase_url: str,
    key: str,
    event_id: str,
    status: EventStatus,
    error: Optional[str] = None,
) -> None:
    body: Dict[str, Any] = {"status": status.value}
    if status in (EventStatus.DONE, EventStatus.FAILED, EventStatus.PROCESSING):
        if status != EventStatus.PROCESSING:
            body["processed_at"] = _now_iso()
    if error:
        body["error"] = error[:500]

    resp = await client.patch(
        f"{supabase_url}/rest/v1/automation_engine_events",
        headers=_headers(key),
        params={"id": f"eq.{event_id}"},
        json=body,
        timeout=10.0,
    )
    if resp.status_code not in (200, 204):
        logger.error(
            "set_event_status(%s → %s) failed %d: %s",
            event_id, status, resp.status_code, resp.text[:200]
        )


async def _fetch_matching_rules(
    client: httpx.AsyncClient,
    supabase_url: str,
    key: str,
    trigger_type: str,
    org_id: str,
) -> List[Dict[str, Any]]:
    resp = await client.get(
        f"{supabase_url}/rest/v1/automation_engine_rules",
        headers=_headers(key),
        params={
            "enabled":      "eq.true",
            "trigger_type": f"eq.{trigger_type}",
            "org_id":       f"eq.{org_id}",
            "order":        "priority.desc",
            "select":       "*",
        },
        timeout=10.0,
    )
    if resp.status_code != 200:
        logger.error("fetch_matching_rules failed %d: %s", resp.status_code, resp.text[:300])
        return []
    return resp.json() or []


async def _insert_run(
    client: httpx.AsyncClient,
    supabase_url: str,
    key: str,
    run: Dict[str, Any],
) -> Optional[str]:
    """Insert an automation_engine_runs row. Returns the new row id or None."""
    resp = await client.post(
        f"{supabase_url}/rest/v1/automation_engine_runs",
        headers=_headers(key),
        json=run,
        timeout=10.0,
    )
    if resp.status_code in (200, 201):
        data = resp.json()
        row = data[0] if isinstance(data, list) else data
        return row.get("id")
    logger.error("insert_run failed %d: %s", resp.status_code, resp.text[:300])
    return None


# ─────────────────────────────────────────────────────────────
# Core processing
# ─────────────────────────────────────────────────────────────

async def _process_single_event(
    client: httpx.AsyncClient,
    supabase_url: str,
    key: str,
    raw_event: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Process one event: evaluate all matching rules and record runs.
    Returns a summary dict for this event.
    """
    event = AutomationEvent(**raw_event)
    summary = {
        "event_id":       event.id,
        "event_type":     event.type,
        "rules_evaluated": 0,
        "rules_triggered": 0,
        "rules_skipped":  0,
        "rules_cooldown": 0,
        "rules_failed":   0,
    }

    # 1. Mark as processing
    await _set_event_status(client, supabase_url, key, event.id, EventStatus.PROCESSING)

    try:
        # 2. Load matching rules
        raw_rules = await _fetch_matching_rules(
            client, supabase_url, key, event.type, event.org_id
        )

        if not raw_rules:
            logger.info("Event %s (type=%s): no matching rules", event.id, event.type)
            await _set_event_status(client, supabase_url, key, event.id, EventStatus.DONE)
            return summary

        # Build evaluation context (flat dict for evaluator + templates)
        eval_context: Dict[str, Any] = {
            "event_id":      event.id,
            "org_id":        event.org_id,
            "patient_id":    event.patient_id,
            "actor_user_id": event.actor_user_id,
            "event_type":    event.type,
            "payload":       event.payload,
            **event.payload,   # expose payload fields at top level too
        }

        for raw_rule in raw_rules:
            rule = AutomationRule(**raw_rule)
            summary["rules_evaluated"] += 1
            started = _now_iso()
            run_id = str(uuid.uuid4())

            # ── Step A: Evaluate conditions ────────────────
            try:
                matched = evaluate_conditions(rule.conditions, eval_context)
            except Exception as exc:
                logger.error("Condition eval error rule=%s: %s", rule.id, exc)
                await _insert_run(client, supabase_url, key, {
                    "id": run_id, "org_id": event.org_id,
                    "event_id": event.id, "rule_id": rule.id,
                    "status": RunStatus.FAILED.value,
                    "started_at": started, "finished_at": _now_iso(),
                    "error": f"Condition eval error: {exc}",
                })
                summary["rules_failed"] += 1
                continue

            if not matched:
                logger.debug("Rule %s (%s): conditions NOT matched – skipping", rule.id, rule.name)
                await _insert_run(client, supabase_url, key, {
                    "id": run_id, "org_id": event.org_id,
                    "event_id": event.id, "rule_id": rule.id,
                    "status": RunStatus.SKIPPED.value,
                    "started_at": started, "finished_at": _now_iso(),
                    "output": {"reason": "conditions_not_matched"},
                })
                summary["rules_skipped"] += 1
                continue

            # ── Step B: Check cooldown ─────────────────────
            try:
                on_cd = await is_on_cooldown(
                    supabase_url, key,
                    org_id=event.org_id,
                    rule_id=rule.id,
                    patient_id=event.patient_id,
                    cooldown_hours=rule.cooldown_hours,
                )
            except Exception as exc:
                logger.error("Cooldown check error rule=%s: %s", rule.id, exc)
                on_cd = False  # fail open

            if on_cd:
                logger.info(
                    "Rule %s (%s): COOLDOWN – skipping for patient=%s",
                    rule.id, rule.name, event.patient_id
                )
                await _insert_run(client, supabase_url, key, {
                    "id": run_id, "org_id": event.org_id,
                    "event_id": event.id, "rule_id": rule.id,
                    "status": RunStatus.COOLDOWN.value,
                    "started_at": started, "finished_at": _now_iso(),
                    "output": {"cooldown_hours": rule.cooldown_hours},
                })
                summary["rules_cooldown"] += 1
                continue

            # ── Step C: Execute actions ────────────────────
            action_ctx = ActionContext(
                event=event,
                rule=rule,
                payload=event.payload,
            )
            try:
                outputs = await execute_actions(
                    supabase_url, key, rule.actions, action_ctx
                )
                all_ok = all(o.get("ok", False) for o in outputs) if outputs else True
                run_status = RunStatus.SUCCESS if all_ok else RunStatus.FAILED

                await _insert_run(client, supabase_url, key, {
                    "id": run_id, "org_id": event.org_id,
                    "event_id": event.id, "rule_id": rule.id,
                    "status": run_status.value,
                    "started_at": started, "finished_at": _now_iso(),
                    "output": {"actions": outputs},
                })

                if all_ok:
                    summary["rules_triggered"] += 1
                    logger.info(
                        "Rule %s (%s): SUCCESS – %d action(s) executed",
                        rule.id, rule.name, len(outputs)
                    )
                else:
                    summary["rules_failed"] += 1
                    logger.warning(
                        "Rule %s (%s): partial failure in actions: %s",
                        rule.id, rule.name, outputs
                    )

            except Exception as exc:
                logger.error("Action execution error rule=%s: %s", rule.id, exc)
                await _insert_run(client, supabase_url, key, {
                    "id": run_id, "org_id": event.org_id,
                    "event_id": event.id, "rule_id": rule.id,
                    "status": RunStatus.FAILED.value,
                    "started_at": started, "finished_at": _now_iso(),
                    "error": str(exc)[:500],
                })
                summary["rules_failed"] += 1

        # 3. Mark event as done
        await _set_event_status(client, supabase_url, key, event.id, EventStatus.DONE)

    except Exception as exc:
        logger.error("Unhandled error processing event %s: %s", event.id, exc)
        await _set_event_status(
            client, supabase_url, key, event.id, EventStatus.FAILED, error=str(exc)
        )

    return summary


# ─────────────────────────────────────────────────────────────
# Public entry-point
# ─────────────────────────────────────────────────────────────

async def process_automation_events(
    supabase_url: str,
    service_role_key: str,
) -> Dict[str, Any]:
    """
    Main batch loop.

    Fetches up to BATCH_SIZE pending events, processes each one, and
    returns a summary dict:
      {
        "processed_events": int,
        "total_rules_evaluated": int,
        "total_rules_triggered": int,
        "total_rules_skipped": int,
        "total_rules_cooldown": int,
        "total_rules_failed": int,
        "event_summaries": [...],
        "execution_time_ms": int,
      }
    """
    start_ts = datetime.now(timezone.utc)
    logger.info("🚀 Automation Engine: starting batch (limit=%d)", BATCH_SIZE)

    result: Dict[str, Any] = {
        "processed_events":     0,
        "total_rules_evaluated": 0,
        "total_rules_triggered": 0,
        "total_rules_skipped":  0,
        "total_rules_cooldown": 0,
        "total_rules_failed":   0,
        "event_summaries":      [],
        "execution_time_ms":    0,
    }

    async with httpx.AsyncClient() as client:
        events = await _fetch_pending_events(client, supabase_url, service_role_key)

        if not events:
            logger.info("✅ No pending events – batch complete")
            result["execution_time_ms"] = _elapsed_ms(start_ts)
            return result

        logger.info("📋 Found %d pending event(s)", len(events))

        for raw_event in events:
            summary = await _process_single_event(
                client, supabase_url, service_role_key, raw_event
            )
            result["processed_events"] += 1
            result["total_rules_evaluated"] += summary["rules_evaluated"]
            result["total_rules_triggered"] += summary["rules_triggered"]
            result["total_rules_skipped"]   += summary["rules_skipped"]
            result["total_rules_cooldown"]  += summary["rules_cooldown"]
            result["total_rules_failed"]    += summary["rules_failed"]
            result["event_summaries"].append(summary)

    result["execution_time_ms"] = _elapsed_ms(start_ts)
    logger.info(
        "✅ Batch done: %d events | %d triggered | %d skipped | %d cooldown | %d failed | %dms",
        result["processed_events"],
        result["total_rules_triggered"],
        result["total_rules_skipped"],
        result["total_rules_cooldown"],
        result["total_rules_failed"],
        result["execution_time_ms"],
    )
    return result


def _elapsed_ms(start: datetime) -> int:
    delta = datetime.now(timezone.utc) - start
    return int(delta.total_seconds() * 1000)

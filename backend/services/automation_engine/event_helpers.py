"""
Automation Engine – Event Emission Helpers

Helper functions to emit automation events from application flows.
These should be called whenever key user actions occur.

Usage Examples:
  
  # When anamnesis is completed
  await emit_anamnesis_completed(
      org_id="...",
      patient_id="...",
      patient_name="João Silva"
  )
  
  # When checklist is updated
  await emit_checklist_updated(
      org_id="...",
      patient_id="...",
      patient_name="Maria Santos",
      completion_pct=75
  )

Integration Points (TODO):
  1. Anamnesis completion: 
     - Frontend: after saving anamnesis form
     - OR Backend: create POST /api/anamnesis endpoint that calls emit_anamnesis_completed()
  
  2. Checklist update:
     - Frontend: after saving checklist changes
     - OR Backend: create POST /api/checklist endpoint that calls emit_checklist_updated()
  
  3. Other flows:
     - Meal plan creation: emit "plan.created"
     - Patient registration: emit "patient.registered"
     - etc.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

from .emitter import emit_event

logger = logging.getLogger(__name__)


def _get_supabase_config() -> tuple[str, str]:
    """Get Supabase configuration from environment."""
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not url or not key:
        logger.error(
            "Supabase credentials not configured. "
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"
        )
    
    return url, key


async def emit_anamnesis_completed(
    org_id: str,
    patient_id: str,
    patient_name: str,
    form_data: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Emit an 'anamnesis.completed' event when a patient completes their anamnesis form.
    
    Args:
        org_id: Professional/organization ID
        patient_id: Patient who completed the form
        patient_name: Patient's name
        form_data: Optional dict with form metadata (e.g., completion_pct, sections_filled)
    
    Returns:
        True if event was emitted successfully, False otherwise
    
    Example:
        await emit_anamnesis_completed(
            org_id="94430e35-9e1e-421e-af2a-e1176ae53369",
            patient_id="d930d42b-a25e-4603-844a-b0f678f1b3a2",
            patient_name="João Silva",
            form_data={"sections_filled": 8, "total_sections": 10}
        )
    """
    url, key = _get_supabase_config()
    if not url or not key:
        return False
    
    payload = {
        "patient_name": patient_name,
        **(form_data or {}),
    }
    
    try:
        result = await emit_event(
            org_id=org_id,
            patient_id=patient_id,
            event_type="anamnesis.completed",
            payload=payload,
            supabase_url=url,
            service_role_key=key,
            dedupe_key_pattern="anamnesis.completed:{patient_id}:{YYYY-MM-DD}",
        )
        
        logger.info(
            f"✅ Emitted anamnesis.completed event for patient {patient_id[:8]}... "
            f"(result: {result})"
        )
        return result is not None
        
    except Exception as exc:
        logger.error(f"❌ Failed to emit anamnesis.completed event: {exc}")
        return False


async def emit_checklist_updated(
    org_id: str,
    patient_id: str,
    patient_name: str,
    completion_pct: int,
    total_tasks: Optional[int] = None,
    completed_tasks: Optional[int] = None,
) -> bool:
    """
    Emit a 'checklist.updated' event when a patient's checklist is modified.
    
    Note: This is optional. The detector already scans for low completion.
    Use this if you want immediate event emission on every checklist update.
    
    Args:
        org_id: Professional/organization ID
        patient_id: Patient whose checklist was updated
        patient_name: Patient's name
        completion_pct: Percentage of tasks completed (0-100)
        total_tasks: Optional total number of tasks
        completed_tasks: Optional number of completed tasks
    
    Returns:
        True if event was emitted successfully, False otherwise
    
    Example:
        await emit_checklist_updated(
            org_id="94430e35-9e1e-421e-af2a-e1176ae53369",
            patient_id="d930d42b-a25e-4603-844a-b0f678f1b3a2",
            patient_name="João Silva",
            completion_pct=75,
            total_tasks=12,
            completed_tasks=9
        )
    """
    url, key = _get_supabase_config()
    if not url or not key:
        return False
    
    payload = {
        "patient_name": patient_name,
        "checklist_pct": completion_pct,
    }
    
    if total_tasks is not None:
        payload["total_tasks"] = total_tasks
    if completed_tasks is not None:
        payload["completed_tasks"] = completed_tasks
    
    try:
        result = await emit_event(
            org_id=org_id,
            patient_id=patient_id,
            event_type="checklist.updated",
            payload=payload,
            supabase_url=url,
            service_role_key=key,
            dedupe_key_pattern="checklist.updated:{patient_id}:{YYYY-MM-DD}",
        )
        
        logger.info(
            f"✅ Emitted checklist.updated event for patient {patient_id[:8]}... "
            f"(pct: {completion_pct}%, result: {result})"
        )
        return result is not None
        
    except Exception as exc:
        logger.error(f"❌ Failed to emit checklist.updated event: {exc}")
        return False


async def emit_custom_event(
    org_id: str,
    patient_id: str,
    event_type: str,
    payload: Dict[str, Any],
    use_daily_dedupe: bool = True,
) -> bool:
    """
    Emit a custom automation event.
    
    Args:
        org_id: Professional/organization ID
        patient_id: Patient ID
        event_type: Event type (e.g., "plan.created", "patient.registered")
        payload: Event payload (must be JSON-serializable)
        use_daily_dedupe: If True, uses daily deduplication key
    
    Returns:
        True if event was emitted successfully, False otherwise
    
    Example:
        await emit_custom_event(
            org_id="94430e35-9e1e-421e-af2a-e1176ae53369",
            patient_id="d930d42b-a25e-4603-844a-b0f678f1b3a2",
            event_type="plan.created",
            payload={"plan_name": "Dieta Low Carb", "plan_id": "abc-123"},
            use_daily_dedupe=True
        )
    """
    url, key = _get_supabase_config()
    if not url or not key:
        return False
    
    dedupe_pattern = None
    if use_daily_dedupe:
        dedupe_pattern = f"{event_type}:{patient_id}:{{YYYY-MM-DD}}"
    
    try:
        result = await emit_event(
            org_id=org_id,
            patient_id=patient_id,
            event_type=event_type,
            payload=payload,
            supabase_url=url,
            service_role_key=key,
            dedupe_key_pattern=dedupe_pattern,
        )
        
        logger.info(
            f"✅ Emitted {event_type} event for patient {patient_id[:8]}... "
            f"(result: {result})"
        )
        return result is not None
        
    except Exception as exc:
        logger.error(f"❌ Failed to emit {event_type} event: {exc}")
        return False

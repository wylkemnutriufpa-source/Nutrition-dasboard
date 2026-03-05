"""
Meal Completion Tracking API

Endpoints for tracking meal completions, calculating adherence,
and integrating with the automation engine.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime, timezone
import httpx
import os

router = APIRouter(prefix="/api/checklist/meals", tags=["meal_completion"])


# ==================== Models ====================

class MealCompletionRequest(BaseModel):
    patient_id: str
    date: str  # YYYY-MM-DD
    task_key: str  # 'breakfast', 'lunch', 'dinner', 'snack1', etc.
    status: str = "completed"  # 'completed', 'pending', 'skipped'
    metadata: Optional[dict] = {}


class BulkMealCompletionRequest(BaseModel):
    patient_id: str
    date: str
    completions: List[dict]  # [{"task_key": "breakfast", "status": "completed"}, ...]


class AdherenceResponse(BaseModel):
    patient_id: str
    date: str
    total_meals: int
    completed_meals: int
    adherence_pct: float
    status: str  # 'excellent', 'good', 'low', 'very_low'


# ==================== Helpers ====================

def get_supabase_config():
    """Get Supabase configuration from environment."""
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    
    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="Supabase configuration not found"
        )
    
    return url, key


def get_adherence_status(adherence_pct: float) -> str:
    """Classify adherence level."""
    if adherence_pct >= 80:
        return "excellent"
    elif adherence_pct >= 60:
        return "good"
    elif adherence_pct >= 40:
        return "low"
    else:
        return "very_low"


async def emit_low_adherence_event(
    patient_id: str,
    patient_name: str,
    adherence_pct: float,
    org_id: str
):
    """Emit checklist.low_detected event for automation engine."""
    from services.automation_engine.emitter import emit_event
    
    url, key = get_supabase_config()
    
    try:
        await emit_event(
            org_id=org_id,
            patient_id=patient_id,
            event_type="checklist.low_detected",
            payload={
                "patient_name": patient_name,
                "checklist_pct": int(adherence_pct),
                "patient_status": "low_adherence",
                "context": "meal_completion",
            },
            supabase_url=url,
            service_role_key=key,
            dedupe_key_pattern="checklist.low_detected:{patient_id}:{YYYY-MM-DD}",
        )
    except Exception as e:
        print(f"Error emitting low adherence event: {e}")


# ==================== Endpoints ====================

@router.post("/complete")
async def mark_meal_complete(req: MealCompletionRequest):
    """
    Mark a meal as completed (or pending/skipped).
    
    Creates or updates a checklist_entry with:
    - task_type = "meal"
    - task_key = meal type (breakfast, lunch, etc.)
    - status = completed/pending/skipped
    
    Idempotent: uses UNIQUE constraint on (patient_id, date, task_type, task_key)
    """
    url, key = get_supabase_config()
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates"
    }
    
    entry = {
        "patient_id": req.patient_id,
        "date": req.date,
        "task_type": "meal",
        "task_key": req.task_key,
        "status": req.status,
        "completed_at": datetime.now(timezone.utc).isoformat() if req.status == "completed" else None,
        "metadata": req.metadata,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    async with httpx.AsyncClient() as client:
        # Upsert entry
        resp = await client.post(
            f"{url}/rest/v1/checklist_entries",
            headers=headers,
            json=entry,
            timeout=10.0
        )
        
        if resp.status_code not in (200, 201):
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Failed to update checklist entry: {resp.text}"
            )
        
        result = resp.json()
        entry_data = result[0] if isinstance(result, list) else result
        
        return {
            "ok": True,
            "entry_id": entry_data.get("id"),
            "status": req.status,
            "task_key": req.task_key
        }


@router.post("/complete/bulk")
async def mark_meals_complete_bulk(req: BulkMealCompletionRequest):
    """
    Mark multiple meals as completed in one request.
    Useful for batch updates from frontend.
    """
    url, key = get_supabase_config()
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates"
    }
    
    entries = []
    for completion in req.completions:
        entry = {
            "patient_id": req.patient_id,
            "date": req.date,
            "task_type": "meal",
            "task_key": completion["task_key"],
            "status": completion.get("status", "completed"),
            "completed_at": datetime.now(timezone.utc).isoformat() if completion.get("status") == "completed" else None,
            "metadata": completion.get("metadata", {}),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        entries.append(entry)
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{url}/rest/v1/checklist_entries",
            headers=headers,
            json=entries,
            timeout=10.0
        )
        
        if resp.status_code not in (200, 201):
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Failed to bulk update: {resp.text}"
            )
        
        return {
            "ok": True,
            "updated_count": len(entries)
        }


@router.get("/adherence/{patient_id}/{date_str}")
async def get_meal_adherence(patient_id: str, date_str: str):
    """
    Calculate meal adherence for a specific date.
    
    Returns:
    - total_meals: expected meals for the day
    - completed_meals: number of meals marked as completed
    - adherence_pct: percentage (0-100)
    - status: 'excellent', 'good', 'low', 'very_low'
    
    If adherence_pct < 40, emits checklist.low_detected event.
    """
    url, key = get_supabase_config()
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    
    async with httpx.AsyncClient() as client:
        # Fetch all meal entries for this patient/date
        resp = await client.get(
            f"{url}/rest/v1/checklist_entries",
            headers=headers,
            params={
                "patient_id": f"eq.{patient_id}",
                "date": f"eq.{date_str}",
                "task_type": "eq.meal",
                "select": "task_key,status"
            },
            timeout=10.0
        )
        
        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail="Failed to fetch entries"
            )
        
        entries = resp.json()
        
        # Count total and completed
        total_meals = len(entries) if entries else 4  # Default: 4 meals/day
        completed_meals = sum(1 for e in entries if e["status"] == "completed")
        
        adherence_pct = (completed_meals / total_meals * 100) if total_meals > 0 else 0
        status = get_adherence_status(adherence_pct)
        
        # Emit event if adherence is low (< 40%)
        if adherence_pct < 40 and completed_meals > 0:  # Only if patient has started tracking
            # Fetch patient info for event
            patient_resp = await client.get(
                f"{url}/rest/v1/profiles",
                headers=headers,
                params={
                    "id": f"eq.{patient_id}",
                    "select": "name"
                },
                timeout=10.0
            )
            
            patient_name = "Patient"
            org_id = None
            
            if patient_resp.status_code == 200:
                patient_data = patient_resp.json()
                if patient_data:
                    patient_name = patient_data[0].get("name", "Patient")
            
            # Get org_id from patient_profiles
            prof_resp = await client.get(
                f"{url}/rest/v1/patient_profiles",
                headers=headers,
                params={
                    "patient_id": f"eq.{patient_id}",
                    "select": "professional_id"
                },
                timeout=10.0
            )
            
            if prof_resp.status_code == 200:
                prof_data = prof_resp.json()
                if prof_data:
                    org_id = prof_data[0].get("professional_id")
            
            if org_id:
                await emit_low_adherence_event(
                    patient_id, patient_name, adherence_pct, org_id
                )
        
        return AdherenceResponse(
            patient_id=patient_id,
            date=date_str,
            total_meals=total_meals,
            completed_meals=completed_meals,
            adherence_pct=round(adherence_pct, 1),
            status=status
        )


@router.get("/streak/{patient_id}")
async def get_patient_streak(patient_id: str):
    """
    Get patient's current streak and adherence stats.
    
    Returns gamification metrics:
    - current_streak_days
    - longest_streak_days
    - total_meals_completed
    """
    url, key = get_supabase_config()
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{url}/rest/v1/patient_adherence_stats",
            headers=headers,
            params={
                "patient_id": f"eq.{patient_id}",
                "select": "*"
            },
            timeout=10.0
        )
        
        if resp.status_code != 200:
            # Return default stats if not found
            return {
                "patient_id": patient_id,
                "current_streak_days": 0,
                "longest_streak_days": 0,
                "total_meals_completed": 0
            }
        
        stats = resp.json()
        if not stats:
            return {
                "patient_id": patient_id,
                "current_streak_days": 0,
                "longest_streak_days": 0,
                "total_meals_completed": 0
            }
        
        return stats[0]

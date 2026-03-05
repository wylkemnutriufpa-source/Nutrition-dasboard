# Automation Engine – Integration Guide

This document explains how to integrate event emission into your application flows.

## Overview

The automation engine has three main components:
1. **Detectors** (background scan) – run periodically via scheduler
2. **Event Emitters** (real-time) – called from app logic when actions occur
3. **Worker** (event processor) – runs periodically via scheduler

## Current Status

### ✅ Implemented
- [x] Scheduler running every 5 minutes (worker) and 6 hours (detectors)
- [x] Detectors for: patient inactivity, plan expiry, low checklist completion
- [x] Event emission helpers (`event_helpers.py`)
- [x] Automation rules (P80: checklist baixo, etc.)

### 🔄 Integration Points (TODO)

The following application flows should emit events when they occur:

#### 1. Anamnesis Completion
**When:** Patient completes/submits their anamnesis form  
**Event Type:** `anamnesis.completed`  
**Integration:**

```python
# Option A: Backend endpoint (if exists)
from services.automation_engine.event_helpers import emit_anamnesis_completed

@api_router.post("/anamnesis/complete")
async def complete_anamnesis(data: AnamnesisData):
    # ... save anamnesis to database ...
    
    # Emit event for automation engine
    await emit_anamnesis_completed(
        org_id=data.professional_id,
        patient_id=data.patient_id,
        patient_name=data.patient_name,
        form_data={"sections_filled": 8, "total_sections": 10}
    )
    
    return {"success": True}
```

```javascript
// Option B: Frontend (if no backend endpoint exists)
// Call the automation engine API directly after saving to Supabase

async function completeAnamnesis(patientId, professionalId) {
  // 1. Save anamnesis to Supabase
  await supabase.from('anamnesis').insert({...});
  
  // 2. Emit event to automation engine
  await fetch(`${API_URL}/api/admin/automation-engine/events/emit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      org_id: professionalId,
      patient_id: patientId,
      type: 'anamnesis.completed',
      payload: {
        patient_name: patientName,
        sections_filled: 8
      }
    })
  });
}
```

#### 2. Checklist Update
**When:** Patient completes a checklist task  
**Event Type:** `checklist.updated` (optional – detector already scans)  
**Integration:**

```python
# Backend
from services.automation_engine.event_helpers import emit_checklist_updated

@api_router.post("/checklist/update")
async def update_checklist(data: ChecklistUpdate):
    # ... update checklist in database ...
    
    # Calculate completion percentage
    total = data.total_tasks
    completed = data.completed_tasks
    pct = int(completed / total * 100) if total > 0 else 0
    
    # Emit event (optional: detector will also catch this periodically)
    await emit_checklist_updated(
        org_id=data.professional_id,
        patient_id=data.patient_id,
        patient_name=data.patient_name,
        completion_pct=pct,
        total_tasks=total,
        completed_tasks=completed
    )
    
    return {"success": True}
```

```javascript
// Frontend
async function updateChecklistTask(patientId, professionalId, taskId, completed) {
  // 1. Update task in Supabase
  await supabase.from('checklist_tasks')
    .update({ completed })
    .eq('id', taskId);
  
  // 2. Optionally emit event immediately (or let detector catch it)
  const stats = await calculateChecklistStats(patientId);
  
  if (stats.completion_pct < 40) {
    await fetch(`${API_URL}/api/admin/automation-engine/events/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        org_id: professionalId,
        patient_id: patientId,
        type: 'checklist.updated',
        payload: {
          patient_name: patientName,
          checklist_pct: stats.completion_pct,
          total_tasks: stats.total,
          completed_tasks: stats.completed
        }
      })
    });
  }
}
```

#### 3. Other Flows (Future)

Add event emission for other important actions:

- **Meal plan created:** `plan.created`
- **Patient registered:** `patient.registered`
- **Appointment scheduled:** `appointment.scheduled`
- **Feedback submitted:** `feedback.submitted`

Use the `emit_custom_event` helper:

```python
from services.automation_engine.event_helpers import emit_custom_event

await emit_custom_event(
    org_id=org_id,
    patient_id=patient_id,
    event_type="plan.created",
    payload={"plan_name": "Dieta Low Carb", "plan_id": plan_id},
    use_daily_dedupe=True
)
```

## Architecture Decision: Detector vs Real-Time Emission

### When to use Detectors (Background Scan)
✅ **Use for:**
- Conditions that emerge over time (inactivity, stale plans)
- Periodic checks (low checklist completion)
- Aggregated data (e.g., "patient hasn't logged in for 7 days")

✅ **Pros:**
- No need to modify existing code
- Works even if frontend doesn't emit events
- Catches edge cases (e.g., tasks disabled after being completed)

### When to use Real-Time Emission
✅ **Use for:**
- Immediate actions (form submitted, task completed)
- Time-sensitive alerts
- User-triggered events

✅ **Pros:**
- Faster response (no waiting for detector cycle)
- More accurate timestamps
- Better for event-driven workflows

### Recommendation
**Use both:**
1. **Real-time emission** for immediate actions (anamnesis completion)
2. **Detectors** as a safety net to catch missed events or periodic checks

## Configuration

The scheduler is controlled by environment variables in `/app/backend/.env`:

```bash
# Enable/disable scheduler
AUTOMATION_ENGINE_ENABLED=true

# Worker runs every N minutes (processes pending events)
AUTOMATION_WORKER_INTERVAL_MINUTES=5

# Detectors run every N hours (scan for conditions)
AUTOMATION_DETECTOR_INTERVAL_HOURS=6

# Orgs to monitor (comma-separated)
AUTOMATION_TARGET_ORG_IDS=meal-adherence-track,94430e35-9e1e-421e-af2a-e1176ae53369
```

## Monitoring

Check scheduler logs:
```bash
tail -f /var/log/supervisor/backend.*.log | grep "Scheduler"
```

Expected output:
```
✅ Automation Scheduler STARTED
   Worker runs every 5 minutes
   Detectors run every 6 hours
   Monitoring 2 orgs

🔄 [Scheduler] Running automation worker...
✅ [Scheduler] Worker completed in 1234ms: 2 events, 1 rules triggered

🔍 [Scheduler] Running detectors for 2 orgs...
  Org 177ff33f...: 3 events emitted
  Org 94430e35...: 1 events emitted
✅ [Scheduler] Detectors completed in 2345ms: 4 total events emitted
```

## Testing Event Emission

### Test from Backend
```python
# In any endpoint or test file
from services.automation_engine.event_helpers import emit_anamnesis_completed

result = await emit_anamnesis_completed(
    org_id="177ff33f-f573-4a9c-aca1-1e4c55d94ece",
    patient_id="d930d42b-a25e-4603-844a-b0f678f1b3a2",
    patient_name="Test Patient"
)
print(f"Event emitted: {result}")
```

### Test from Frontend
```javascript
const response = await fetch(
  `${API_URL}/api/admin/automation-engine/events/emit`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      org_id: '177ff33f-f573-4a9c-aca1-1e4c55d94ece',
      patient_id: 'd930d42b-a25e-4603-844a-b0f678f1b3a2',
      type: 'anamnesis.completed',
      payload: { patient_name: 'Test Patient' }
    })
  }
);

console.log(await response.json());
```

## Next Steps

1. ✅ **Scheduler implemented and running**
2. ✅ **Event helpers created**
3. 🔄 **TODO: Integrate helpers into anamnesis/checklist flows**
   - Identify where anamnesis is saved
   - Identify where checklist is updated
   - Add `await emit_*()` calls
4. 🔄 **TODO: Test end-to-end with real user flows**
5. 🔄 **TODO: Create automation rules for anamnesis.completed event**

## Troubleshooting

### Scheduler not running
- Check logs: `tail -f /var/log/supervisor/backend.*.log | grep Scheduler`
- Verify `AUTOMATION_ENGINE_ENABLED=true` in `.env`
- Restart backend: `sudo supervisorctl restart backend`

### Events not being processed
- Check worker logs: look for "Automation worker" messages
- Verify rules exist and are enabled
- Check event status in Supabase: `automation_engine_events` table

### Detectors not finding patients
- Verify `AUTOMATION_TARGET_ORG_IDS` includes correct org_ids
- Check detector logs for errors
- Verify data exists in Supabase tables

## API Reference

All automation engine endpoints are available under `/api/admin/automation-engine/`:

- `POST /run` – Run worker manually (process pending events)
- `POST /detect` – Run detectors manually for specific org_id
- `POST /events/emit` – Emit a custom event
- `GET /rules` – List all automation rules
- `POST /rules` – Create new automation rule
- `GET /runs` – List recent automation runs
- `GET /health` – Check engine health status

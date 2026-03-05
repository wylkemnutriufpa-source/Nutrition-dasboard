"""
Automation Engine – shared types (Pydantic models + enums).
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────────────────

class EventStatus(str, Enum):
    PENDING    = "pending"
    PROCESSING = "processing"
    DONE       = "done"
    FAILED     = "failed"
    SKIPPED    = "skipped"


class RunStatus(str, Enum):
    SUCCESS  = "success"
    FAILED   = "failed"
    SKIPPED  = "skipped"
    COOLDOWN = "cooldown"


class ActionType(str, Enum):
    NOTIFY_USER         = "notify_user"
    NOTIFY_PROFESSIONAL = "notify_professional"
    CREATE_TASK         = "create_task"


# ─────────────────────────────────────────────────────────────
# Database row models
# ─────────────────────────────────────────────────────────────

class AutomationEvent(BaseModel):
    id:            str
    org_id:        str
    patient_id:    Optional[str]  = None
    actor_user_id: Optional[str]  = None
    type:          str
    payload:       Dict[str, Any] = Field(default_factory=dict)
    status:        EventStatus    = EventStatus.PENDING
    created_at:    Optional[str]  = None
    processed_at:  Optional[str]  = None
    error:         Optional[str]  = None


class AutomationRule(BaseModel):
    id:             str
    org_id:         str
    name:           str
    enabled:        bool          = True
    trigger_type:   str
    conditions:     Dict[str, Any] = Field(default_factory=dict)
    actions:        List[Dict[str, Any]] = Field(default_factory=list)
    cooldown_hours: int           = 24
    priority:       int           = 0
    created_at:     Optional[str] = None
    updated_at:     Optional[str] = None


class AutomationRun(BaseModel):
    org_id:      str
    event_id:    str
    rule_id:     str
    status:      RunStatus
    started_at:  str
    finished_at: Optional[str]        = None
    output:      Optional[Dict[str, Any]] = None
    error:       Optional[str]        = None


# ─────────────────────────────────────────────────────────────
# Context passed to every action / template
# ─────────────────────────────────────────────────────────────

class ActionContext(BaseModel):
    event:   AutomationEvent
    rule:    AutomationRule
    payload: Dict[str, Any] = Field(default_factory=dict)   # event.payload flat copy

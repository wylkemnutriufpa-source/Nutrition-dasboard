"""
Automation Engine – package init.
Exposes the public API surface.
"""
from .worker import process_automation_events
from .types import (
    AutomationEvent,
    AutomationRule,
    AutomationRun,
    ActionType,
    EventStatus,
    RunStatus,
    ActionContext,
)

__all__ = [
    "process_automation_events",
    "AutomationEvent",
    "AutomationRule",
    "AutomationRun",
    "ActionType",
    "EventStatus",
    "RunStatus",
    "ActionContext",
]

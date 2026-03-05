"""
Automation Engine – DSL condition evaluator.

Supported leaf operators  : eq, neq, gt, gte, lt, lte, contains, in, exists
Supported logical wrappers: and, or

Condition schema examples
─────────────────────────
Simple:
  { "payload.inactive_days": { "gte": 5 } }

Logical:
  {
    "and": [
      { "payload.inactive_days": { "gte": 5 } },
      { "payload.patient_status": { "eq": "active" } }
    ]
  }

Nested or:
  {
    "or": [
      { "payload.score": { "lt": 30 } },
      { "payload.flag": { "exists": true } }
    ]
  }
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Path resolver: "payload.inactive_days" → context value
# ─────────────────────────────────────────────────────────────

def _resolve_path(context: Dict[str, Any], path: str) -> Any:
    """
    Traverse nested dict using dot-notation path.
    e.g. "payload.inactive_days" on {"payload": {"inactive_days": 7}} → 7
    Returns None if any segment is missing.
    """
    parts = path.split(".")
    node: Any = context
    for part in parts:
        if not isinstance(node, dict):
            return None
        node = node.get(part)
    return node


# ─────────────────────────────────────────────────────────────
# Leaf operator evaluator
# ─────────────────────────────────────────────────────────────

def _apply_operator(actual: Any, op: str, expected: Any) -> bool:
    """
    Evaluate a single leaf comparison.
    """
    try:
        if op == "eq":
            return actual == expected
        if op == "neq":
            return actual != expected
        if op == "gt":
            return actual is not None and actual > expected
        if op == "gte":
            return actual is not None and actual >= expected
        if op == "lt":
            return actual is not None and actual < expected
        if op == "lte":
            return actual is not None and actual <= expected
        if op == "contains":
            if actual is None:
                return False
            return str(expected).lower() in str(actual).lower()
        if op == "in":
            if not isinstance(expected, list):
                return False
            return actual in expected
        if op == "exists":
            # expected = true → field must be present and not None
            # expected = false → field must be absent or None
            if expected:
                return actual is not None
            return actual is None
        logger.warning("Unknown operator '%s' – treating as false", op)
        return False
    except (TypeError, ValueError) as exc:
        logger.debug("Operator '%s' comparison error: %s", op, exc)
        return False


# ─────────────────────────────────────────────────────────────
# Core recursive evaluator
# ─────────────────────────────────────────────────────────────

def evaluate_conditions(conditions: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """
    Recursively evaluate a conditions dict against a context dict.

    Returns True if the conditions match, False otherwise.
    An empty conditions dict is treated as always-true.
    """
    if not conditions:
        return True

    for key, value in conditions.items():

        # ── Logical operators ──────────────────────────────
        if key == "and":
            if not isinstance(value, list):
                logger.warning("'and' operator expects a list, got %s", type(value))
                return False
            if not all(evaluate_conditions(sub, context) for sub in value):
                return False
            continue

        if key == "or":
            if not isinstance(value, list):
                logger.warning("'or' operator expects a list, got %s", type(value))
                return False
            if not any(evaluate_conditions(sub, context) for sub in value):
                return False
            continue

        # ── Leaf condition: { "path": { "op": expected } } ──
        if not isinstance(value, dict):
            logger.warning(
                "Unexpected condition format for key '%s': value must be a dict, got %s",
                key, type(value)
            )
            return False

        actual = _resolve_path(context, key)

        for op, expected in value.items():
            if not _apply_operator(actual, op, expected):
                return False

    return True

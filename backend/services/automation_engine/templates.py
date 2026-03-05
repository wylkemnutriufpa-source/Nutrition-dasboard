"""
Automation Engine – mustache-style string template renderer.

Replaces {token} placeholders with values from a flat context dict.

Examples
────────
  render("Olá {patient_name}!", {"patient_name": "João"})
  → "Olá João!"

  render("Inativo há {inactive_days} dias", {"inactive_days": 7})
  → "Inativo há 7 dias"

Unknown tokens are left as-is (no crash).
"""
from __future__ import annotations

import re
from typing import Any, Dict


_PATTERN = re.compile(r"\{([\w.]+)\}")


def _flatten(data: Dict[str, Any], prefix: str = "", sep: str = ".") -> Dict[str, Any]:
    """
    Flatten a nested dict into a single-level dict with dot-separated keys.
    e.g. {"payload": {"inactive_days": 5}} → {"payload.inactive_days": 5, ...}

    Also keeps a top-level entry for leaf keys so templates like
    {inactive_days} work directly without the "payload." prefix.
    """
    result: Dict[str, Any] = {}
    for key, value in data.items():
        full_key = f"{prefix}{sep}{key}" if prefix else key
        if isinstance(value, dict):
            result[full_key] = value               # keep the dict itself too
            result.update(_flatten(value, full_key, sep))
        else:
            result[full_key] = value
            # Also expose the leaf key without its prefix so {inactive_days} works
            result[key] = value
    return result


def render(template: str, context: Dict[str, Any]) -> str:
    """
    Replace all {token} occurrences in *template* with values from *context*.
    Nested context dicts are flattened so both {inactive_days} and
    {payload.inactive_days} resolve correctly.
    Unknown tokens are left unchanged.
    """
    if not template or not context:
        return template or ""

    flat = _flatten(context)

    def replacer(match: re.Match) -> str:
        token = match.group(1)
        value = flat.get(token)
        if value is None:
            return match.group(0)          # leave {unknown} intact
        return str(value)

    return _PATTERN.sub(replacer, template)


def render_dict(data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively render all string values inside a dict (e.g. an action payload).
    """
    result: Dict[str, Any] = {}
    for key, value in data.items():
        if isinstance(value, str):
            result[key] = render(value, context)
        elif isinstance(value, dict):
            result[key] = render_dict(value, context)
        elif isinstance(value, list):
            result[key] = [
                render(item, context) if isinstance(item, str)
                else render_dict(item, context) if isinstance(item, dict)
                else item
                for item in value
            ]
        else:
            result[key] = value
    return result

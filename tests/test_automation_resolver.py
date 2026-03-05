"""
Unit tests – template rendering + target resolution.

All Supabase/HTTP calls are mocked via unittest.mock so these tests
run without any network access or real credentials.

Run from /app:
    python -m pytest tests/test_automation_resolver.py -v
"""
from __future__ import annotations

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Any, Dict

import pytest

from services.automation_engine.templates import render, render_dict
from services.automation_engine.resolver import (
    resolve_notification_target,
    _resolve_org_owner,
    _resolve_assigned_professional,
)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _mock_response(json_data: Any, status_code: int = 200) -> MagicMock:
    """Create a mock httpx.Response."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data
    resp.text = str(json_data)
    return resp


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


URL = "https://fake.supabase.co"
KEY = "fake-service-role-key"


# ─────────────────────────────────────────────────────────────
# SECTION 1 – Template rendering (extends existing tests)
# ─────────────────────────────────────────────────────────────

class TestTemplateRendering:

    def test_simple_token(self):
        assert render("Hello {name}!", {"name": "Ana"}) == "Hello Ana!"

    def test_numeric_token(self):
        assert render("{inactive_days} dias", {"inactive_days": 7}) == "7 dias"

    def test_nested_payload_dotpath(self):
        ctx = {"payload": {"inactive_days": 5, "patient_name": "João"}}
        assert render("{payload.inactive_days}", ctx) == "5"
        assert render("{payload.patient_name}", ctx) == "João"

    def test_flat_leaf_from_payload(self):
        """Top-level {token} also resolves payload leaf keys."""
        ctx = {"payload": {"inactive_days": 5}}
        assert render("{inactive_days}", ctx) == "5"

    def test_multiple_tokens_same_string(self):
        ctx = {"patient_name": "Maria", "inactive_days": 10}
        tmpl = "{patient_name} está inativo há {inactive_days} dias."
        assert render(tmpl, ctx) == "Maria está inativo há 10 dias."

    def test_unknown_token_preserved(self):
        assert render("Olá {unknown}!", {}) == "Olá {unknown}!"

    def test_empty_template(self):
        assert render("", {"a": 1}) == ""

    def test_empty_context(self):
        assert render("Hello {name}!", {}) == "Hello {name}!"

    def test_dotpath_token_preserved_when_missing(self):
        assert render("{payload.nonexistent}", {}) == "{payload.nonexistent}"

    def test_render_dict_nested(self):
        action = {
            "title": "Alerta para {patient_name}",
            "body":  "Inativo há {inactive_days} dias",
            "meta":  {"rule": "{rule_id}", "level": "high"},
        }
        ctx = {"patient_name": "Ana", "inactive_days": 6, "rule_id": "r-001"}
        result = render_dict(action, ctx)
        assert result["title"] == "Alerta para Ana"
        assert result["body"]  == "Inativo há 6 dias"
        assert result["meta"]["rule"] == "r-001"
        assert result["meta"]["level"] == "high"   # non-token string untouched

    def test_render_dict_list_values(self):
        action = {"tags": ["{patient_name}", "static", "{inactive_days}"]}
        ctx = {"patient_name": "Ana", "inactive_days": 3}
        result = render_dict(action, ctx)
        assert result["tags"] == ["Ana", "static", "3"]

    def test_render_dict_non_string_values_unchanged(self):
        action = {"count": 42, "active": True, "ratio": 0.75}
        result = render_dict(action, {"count": 99})
        assert result["count"] == 42       # int untouched
        assert result["active"] is True
        assert result["ratio"] == 0.75


# ─────────────────────────────────────────────────────────────
# SECTION 2 – resolve_org_owner
# ─────────────────────────────────────────────────────────────

class TestResolveOrgOwner:

    def test_returns_org_id_when_profile_found(self):
        mock_resp = _mock_response([{"id": "prof-001", "role": "professional"}])
        with patch("services.automation_engine.resolver.httpx.AsyncClient") as MockClient:
            MockClient.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                get=AsyncMock(return_value=mock_resp)
            ))
            MockClient.return_value.__aexit__ = AsyncMock(return_value=None)
            result = run(_resolve_org_owner("prof-001", URL, KEY))
        assert result == "prof-001"

    def test_fallback_to_org_id_when_profile_not_found(self):
        """Profile query returns empty list → fallback to org_id itself."""
        mock_resp = _mock_response([])
        with patch("services.automation_engine.resolver.httpx.AsyncClient") as MockClient:
            MockClient.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                get=AsyncMock(return_value=mock_resp)
            ))
            MockClient.return_value.__aexit__ = AsyncMock(return_value=None)
            result = run(_resolve_org_owner("prof-001", URL, KEY))
        assert result == "prof-001"    # fail-safe

    def test_fallback_on_http_error(self):
        """Network error → still returns org_id as fail-safe."""
        with patch("services.automation_engine.resolver.httpx.AsyncClient") as MockClient:
            MockClient.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                get=AsyncMock(side_effect=Exception("timeout"))
            ))
            MockClient.return_value.__aexit__ = AsyncMock(return_value=None)
            result = run(_resolve_org_owner("prof-001", URL, KEY))
        assert result == "prof-001"

    def test_returns_none_for_empty_org_id(self):
        result = run(_resolve_org_owner("", URL, KEY))
        assert result is None


# ─────────────────────────────────────────────────────────────
# SECTION 3 – resolve_assigned_professional
# ─────────────────────────────────────────────────────────────

class TestResolveAssignedProfessional:

    def test_returns_professional_id_when_mapping_exists(self):
        mock_resp = _mock_response([{"professional_id": "prof-999"}])
        with patch("services.automation_engine.resolver.httpx.AsyncClient") as MockClient:
            MockClient.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                get=AsyncMock(return_value=mock_resp)
            ))
            MockClient.return_value.__aexit__ = AsyncMock(return_value=None)
            result = run(_resolve_assigned_professional("pat-123", URL, KEY))
        assert result == "prof-999"

    def test_returns_none_when_no_mapping(self):
        mock_resp = _mock_response([])
        with patch("services.automation_engine.resolver.httpx.AsyncClient") as MockClient:
            MockClient.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                get=AsyncMock(return_value=mock_resp)
            ))
            MockClient.return_value.__aexit__ = AsyncMock(return_value=None)
            result = run(_resolve_assigned_professional("pat-123", URL, KEY))
        assert result is None

    def test_returns_none_for_empty_patient_id(self):
        result = run(_resolve_assigned_professional("", URL, KEY))
        assert result is None

    def test_returns_none_on_http_error(self):
        with patch("services.automation_engine.resolver.httpx.AsyncClient") as MockClient:
            MockClient.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                get=AsyncMock(side_effect=Exception("connection refused"))
            ))
            MockClient.return_value.__aexit__ = AsyncMock(return_value=None)
            result = run(_resolve_assigned_professional("pat-123", URL, KEY))
        assert result is None


# ─────────────────────────────────────────────────────────────
# SECTION 4 – resolve_notification_target (high-level)
# ─────────────────────────────────────────────────────────────

class TestResolveNotificationTarget:

    def _mock_client_get(self, return_value):
        mock_resp = _mock_response(return_value)
        mock_client = MagicMock()
        mock_client.get = AsyncMock(return_value=mock_resp)
        cm = MagicMock()
        cm.__aenter__ = AsyncMock(return_value=mock_client)
        cm.__aexit__  = AsyncMock(return_value=None)
        return cm

    def test_org_owner_target(self):
        cm = self._mock_client_get([{"id": "prof-001", "role": "professional"}])
        with patch("services.automation_engine.resolver.httpx.AsyncClient", return_value=cm):
            result = run(resolve_notification_target(
                target="org_owner",
                org_id="prof-001",
                patient_id="pat-111",
                supabase_url=URL,
                service_role_key=KEY,
            ))
        assert result == "prof-001"

    def test_assigned_professional_found(self):
        cm = self._mock_client_get([{"professional_id": "prof-assigned"}])
        with patch("services.automation_engine.resolver.httpx.AsyncClient", return_value=cm):
            result = run(resolve_notification_target(
                target="assigned_professional",
                org_id="prof-owner",
                patient_id="pat-111",
                supabase_url=URL,
                service_role_key=KEY,
            ))
        assert result == "prof-assigned"

    def test_assigned_professional_fallback_to_org_owner(self):
        """No patient_profile mapping → falls back to org_owner."""
        # First call (patient_profiles) returns empty, second call (profiles) returns profile
        mock_empty = _mock_response([])
        mock_prof  = _mock_response([{"id": "prof-owner", "role": "professional"}])
        mock_client = MagicMock()
        mock_client.get = AsyncMock(side_effect=[mock_empty, mock_prof])
        cm = MagicMock()
        cm.__aenter__ = AsyncMock(return_value=mock_client)
        cm.__aexit__  = AsyncMock(return_value=None)
        with patch("services.automation_engine.resolver.httpx.AsyncClient", return_value=cm):
            result = run(resolve_notification_target(
                target="assigned_professional",
                org_id="prof-owner",
                patient_id="pat-111",
                supabase_url=URL,
                service_role_key=KEY,
            ))
        assert result == "prof-owner"

    def test_assigned_professional_no_patient_id_fallback(self):
        """patient_id is None → skips patient_profiles lookup → org_owner."""
        cm = self._mock_client_get([{"id": "prof-owner", "role": "professional"}])
        with patch("services.automation_engine.resolver.httpx.AsyncClient", return_value=cm):
            result = run(resolve_notification_target(
                target="assigned_professional",
                org_id="prof-owner",
                patient_id=None,
                supabase_url=URL,
                service_role_key=KEY,
            ))
        assert result == "prof-owner"

    def test_unknown_target_returns_none(self):
        result = run(resolve_notification_target(
            target="unknown_target",
            org_id="prof-001",
            patient_id="pat-111",
            supabase_url=URL,
            service_role_key=KEY,
        ))
        assert result is None

    def test_empty_target_returns_none(self):
        result = run(resolve_notification_target(
            target="",
            org_id="prof-001",
            patient_id="pat-111",
            supabase_url=URL,
            service_role_key=KEY,
        ))
        assert result is None

    def test_target_case_insensitive(self):
        """Target matching is case-insensitive."""
        cm = self._mock_client_get([{"id": "prof-001", "role": "professional"}])
        with patch("services.automation_engine.resolver.httpx.AsyncClient", return_value=cm):
            result = run(resolve_notification_target(
                target="ORG_OWNER",
                org_id="prof-001",
                patient_id=None,
                supabase_url=URL,
                service_role_key=KEY,
            ))
        assert result == "prof-001"

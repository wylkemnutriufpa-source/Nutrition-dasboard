"""
Unit tests for the Automation Engine evaluator (pure logic, no I/O).
Run from /app/backend:  python -m pytest ../tests/test_automation_evaluator.py -v
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from services.automation_engine.evaluator import evaluate_conditions
from services.automation_engine.templates import render, render_dict


# ─────────────────────────────────────────────────────────────
# evaluate_conditions
# ─────────────────────────────────────────────────────────────

CTX = {
    "payload": {
        "inactive_days": 7,
        "patient_status": "active",
        "score": 45,
        "tags": ["vip", "nutritionist"],
        "flag": True,
    },
    "org_id": "org-001",
    "patient_id": "pat-001",
}


def test_eq_match():
    assert evaluate_conditions({"payload.patient_status": {"eq": "active"}}, CTX)


def test_eq_no_match():
    assert not evaluate_conditions({"payload.patient_status": {"eq": "inactive"}}, CTX)


def test_neq():
    assert evaluate_conditions({"payload.patient_status": {"neq": "inactive"}}, CTX)


def test_gte_match():
    assert evaluate_conditions({"payload.inactive_days": {"gte": 7}}, CTX)


def test_gte_no_match():
    assert not evaluate_conditions({"payload.inactive_days": {"gte": 8}}, CTX)


def test_gt():
    assert evaluate_conditions({"payload.inactive_days": {"gt": 6}}, CTX)
    assert not evaluate_conditions({"payload.inactive_days": {"gt": 7}}, CTX)


def test_lt():
    assert evaluate_conditions({"payload.score": {"lt": 50}}, CTX)
    assert not evaluate_conditions({"payload.score": {"lt": 45}}, CTX)


def test_lte():
    assert evaluate_conditions({"payload.score": {"lte": 45}}, CTX)


def test_contains():
    assert evaluate_conditions({"payload.patient_status": {"contains": "act"}}, CTX)
    assert not evaluate_conditions({"payload.patient_status": {"contains": "xyz"}}, CTX)


def test_in_operator():
    assert evaluate_conditions({"payload.patient_status": {"in": ["active", "pending"]}}, CTX)
    assert not evaluate_conditions({"payload.patient_status": {"in": ["inactive"]}}, CTX)


def test_exists_true():
    assert evaluate_conditions({"payload.flag": {"exists": True}}, CTX)


def test_exists_false_missing_key():
    assert evaluate_conditions({"payload.nonexistent": {"exists": False}}, CTX)
    assert not evaluate_conditions({"payload.nonexistent": {"exists": True}}, CTX)


def test_and_all_match():
    cond = {
        "and": [
            {"payload.inactive_days": {"gte": 5}},
            {"payload.patient_status": {"eq": "active"}},
        ]
    }
    assert evaluate_conditions(cond, CTX)


def test_and_one_fails():
    cond = {
        "and": [
            {"payload.inactive_days": {"gte": 5}},
            {"payload.patient_status": {"eq": "inactive"}},
        ]
    }
    assert not evaluate_conditions(cond, CTX)


def test_or_one_match():
    cond = {
        "or": [
            {"payload.inactive_days": {"gte": 99}},   # false
            {"payload.patient_status": {"eq": "active"}},  # true
        ]
    }
    assert evaluate_conditions(cond, CTX)


def test_or_none_match():
    cond = {
        "or": [
            {"payload.inactive_days": {"gte": 99}},
            {"payload.patient_status": {"eq": "inactive"}},
        ]
    }
    assert not evaluate_conditions(cond, CTX)


def test_empty_conditions_always_true():
    assert evaluate_conditions({}, CTX)


def test_nested_and_or():
    cond = {
        "and": [
            {"payload.inactive_days": {"gte": 5}},
            {"or": [
                {"payload.score": {"lt": 30}},
                {"payload.patient_status": {"eq": "active"}},
            ]},
        ]
    }
    assert evaluate_conditions(cond, CTX)


# ─────────────────────────────────────────────────────────────
# templates.render / render_dict
# ─────────────────────────────────────────────────────────────

def test_render_simple():
    assert render("Olá {patient_id}!", {"patient_id": "pat-001"}) == "Olá pat-001!"


def test_render_nested_payload():
    ctx = {"payload": {"inactive_days": 7}}
    assert render("Inativo há {inactive_days} dias", ctx) == "Inativo há 7 dias"
    assert render("Inativo há {payload.inactive_days} dias", ctx) == "Inativo há 7 dias"


def test_render_unknown_token_unchanged():
    assert render("Hello {unknown}!", {}) == "Hello {unknown}!"


def test_render_dict_recursive():
    action = {
        "title": "Atenção a {patient_id}",
        "body": "Inativo há {inactive_days} dias",
        "meta": {"rule": "{rule_id}"},
    }
    ctx = {"patient_id": "p1", "inactive_days": 5, "rule_id": "r1"}
    result = render_dict(action, ctx)
    assert result["title"] == "Atenção a p1"
    assert result["body"] == "Inativo há 5 dias"
    assert result["meta"]["rule"] == "r1"

"""
Admin Program Management Routes
Gestão global do Programa (ex: Projeto Biquíni Branco).

Endpoints:
  GET  /api/admin/program/protocol-rules        – listar regras do programa
  POST /api/admin/program/protocol-rules        – criar regra
  PATCH /api/admin/program/protocol-rules/{id}  – editar regra
  DELETE /api/admin/program/protocol-rules/{id} – remover regra

  GET  /api/admin/program/patients-overview     – todos os pacientes com mês relativo + status
  POST /api/admin/program/apply-rules           – aplicar regras automáticas (dry_run opcional)
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime
from math import ceil
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from security.auth import CurrentUser, get_current_user_with_db_role

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin-program"])

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

_ALLOWED_ROLES = {"admin", "professional"}


def _h():
    return {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _require_pro(user: CurrentUser):
    if user.app_role not in _ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Acesso negado")


def _relative_month(start_date_str: str | None) -> int:
    """
    Calcula o mês relativo do paciente a partir de uma data de início.
    Mês 1 = primeiros 30 dias, mês 2 = 31-60 dias, etc.
    Retorna 1 se não houver data.
    """
    if not start_date_str:
        return 1
    try:
        start = date.fromisoformat(start_date_str[:10])
        delta = (date.today() - start).days
        if delta < 0:
            return 0  # ainda não começou
        return max(1, ceil((delta + 1) / 30))
    except Exception:
        return 1


# ─── Models ──────────────────────────────────────────────────────────────────

class ProtocolRuleCreate(BaseModel):
    program_id: str = "biquini_branco"
    protocol_id: str
    protocol_name: Optional[str] = None
    trigger_month: int
    auto_activate: bool = False
    notes: Optional[str] = None


class ProtocolRulePatch(BaseModel):
    trigger_month: Optional[int] = None
    auto_activate: Optional[bool] = None
    notes: Optional[str] = None


class ApplyRulesRequest(BaseModel):
    program_id: str = "biquini_branco"
    dry_run: bool = False  # se True: só simula, não ativa nada


# ─── CRUD de Regras ──────────────────────────────────────────────────────────

@router.get("/admin/program/protocol-rules")
async def list_protocol_rules(
    program_id: str = "biquini_branco",
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """Lista regras do programa ordenadas por mês."""
    _require_pro(current_user)
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(
            f"{SUPABASE_URL}/rest/v1/program_protocol_rules",
            headers=_h(),
            params={"program_id": f"eq.{program_id}", "order": "trigger_month.asc"},
        )
    if r.status_code != 200:
        raise HTTPException(500, f"Erro ao buscar regras: {r.text[:200]}")
    return {"rules": r.json()}


@router.post("/admin/program/protocol-rules", status_code=201)
async def create_protocol_rule(
    body: ProtocolRuleCreate,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """Cria uma regra de protocolo para o programa."""
    _require_pro(current_user)
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(
            f"{SUPABASE_URL}/rest/v1/program_protocol_rules",
            headers=_h(),
            json=body.dict(),
        )
    if r.status_code not in (200, 201):
        raise HTTPException(500, f"Erro ao criar regra: {r.text[:200]}")
    return r.json()[0] if isinstance(r.json(), list) else r.json()


@router.patch("/admin/program/protocol-rules/{rule_id}")
async def patch_protocol_rule(
    rule_id: str,
    body: ProtocolRulePatch,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    _require_pro(current_user)
    payload = {k: v for k, v in body.dict().items() if v is not None}
    if not payload:
        raise HTTPException(400, "Nada para atualizar")
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.patch(
            f"{SUPABASE_URL}/rest/v1/program_protocol_rules",
            headers=_h(),
            params={"id": f"eq.{rule_id}"},
            json=payload,
        )
    if r.status_code not in (200, 204):
        raise HTTPException(500, f"Erro ao atualizar regra: {r.text[:200]}")
    return {"ok": True}


@router.delete("/admin/program/protocol-rules/{rule_id}", status_code=204)
async def delete_protocol_rule(
    rule_id: str,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    _require_pro(current_user)
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.delete(
            f"{SUPABASE_URL}/rest/v1/program_protocol_rules",
            headers={**_h(), "Prefer": "return=minimal"},
            params={"id": f"eq.{rule_id}"},
        )
    if r.status_code not in (200, 204):
        raise HTTPException(500, f"Erro ao remover regra: {r.text[:200]}")


# ─── Visão Global dos Pacientes ──────────────────────────────────────────────

@router.get("/admin/program/patients-overview")
async def patients_overview(
    program_id: str = "biquini_branco",
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Retorna todos os pacientes do profissional com:
    - mês relativo (calculado a partir de plan_start_date ou created_at)
    - protocolos ativos
    - quais regras do programa deveriam estar aplicadas e se estão

    Lógica de mês relativo:
      1. Usa plan_start_date de patient_journey (se existir)
      2. Fallback: created_at de patient_profiles
    """
    _require_pro(current_user)
    professional_id = current_user.user_id

    async with httpx.AsyncClient(timeout=20) as c:

        # 1. Buscar todos os pacientes
        pp_resp = await c.get(
            f"{SUPABASE_URL}/rest/v1/patient_profiles",
            headers=_h(),
            params={
                "professional_id": f"eq.{professional_id}",
                "select": "patient_id,created_at",
                "order": "created_at.desc",
                "limit": "200",
            },
        )
        if pp_resp.status_code != 200:
            raise HTTPException(500, "Erro ao buscar pacientes")
        patients = pp_resp.json()
        if not patients:
            return {"patients": [], "rules": [], "summary": {"total": 0}}

        patient_ids = [p["patient_id"] for p in patients]

        # 2. Buscar journeys para plan_start_date
        journeys_resp = await c.get(
            f"{SUPABASE_URL}/rest/v1/patient_journey",
            headers=_h(),
            params={
                "select": "patient_id,plan_start_date,plan_name",
                "patient_id": f"in.({','.join(patient_ids)})",
            },
        )
        journey_map: dict = {}
        if journeys_resp.status_code == 200:
            for j in journeys_resp.json():
                journey_map[j["patient_id"]] = j

        # 3. Buscar perfis (nome completo)
        profiles_resp = await c.get(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers=_h(),
            params={
                "id": f"in.({','.join(patient_ids)})",
                "select": "id,name,email",
            },
        )
        profile_map: dict = {}
        if profiles_resp.status_code == 200:
            for pf in profiles_resp.json():
                profile_map[pf["id"]] = pf

        # 4. Buscar protocolos ativos de todos os pacientes
        active_pp_resp = await c.get(
            f"{SUPABASE_URL}/rest/v1/patient_protocols",
            headers=_h(),
            params={
                "patient_id": f"in.({','.join(patient_ids)})",
                "status": "in.(active,scheduled)",
                "select": "id,patient_id,protocol_id,status,start_date,protocols(name,category)",
            },
        )
        active_protocols_map: dict[str, list] = {pid: [] for pid in patient_ids}
        if active_pp_resp.status_code == 200:
            for ap in active_pp_resp.json():
                pid = ap["patient_id"]
                if pid in active_protocols_map:
                    active_protocols_map[pid].append(ap)

        # 5. Buscar regras do programa
        rules_resp = await c.get(
            f"{SUPABASE_URL}/rest/v1/program_protocol_rules",
            headers=_h(),
            params={"program_id": f"eq.{program_id}", "order": "trigger_month.asc"},
        )
        rules = rules_resp.json() if rules_resp.status_code == 200 else []

    # 6. Montar overview por paciente
    result = []
    for p in patients:
        pid = p["patient_id"]
        journey = journey_map.get(pid)
        start_str = (journey or {}).get("plan_start_date") or p.get("created_at", "")[:10]

        relative_month = _relative_month(start_str)
        active_prots = active_protocols_map.get(pid, [])
        active_protocol_ids = {ap["protocol_id"] for ap in active_prots}

        pf = profile_map.get(pid, {})

        # regras que deveriam estar ativas (trigger_month <= mês relativo)
        pending_rules = []
        applied_rules = []
        upcoming_rules = []
        for rule in rules:
            if rule["trigger_month"] <= relative_month:
                if rule["protocol_id"] in active_protocol_ids:
                    applied_rules.append(rule)
                else:
                    pending_rules.append(rule)
            else:
                if rule["trigger_month"] == relative_month + 1:
                    upcoming_rules.append(rule)

        result.append({
            "patient_id": pid,
            "full_name": pf.get("name") or p.get("name") or "—",
            "email": pf.get("email", ""),
            "plan_start_date": start_str,
            "plan_name": (journey or {}).get("plan_name", ""),
            "relative_month": relative_month,
            "active_protocols": [
                {
                    "id": ap["id"],
                    "protocol_id": ap["protocol_id"],
                    "name": (ap.get("protocols") or {}).get("name", "?"),
                    "status": ap["status"],
                }
                for ap in active_prots
            ],
            "pending_rules": pending_rules,   # deveria estar ativo, mas não está
            "applied_rules": applied_rules,   # está conforme a regra
            "upcoming_rules": upcoming_rules, # próximo mês
            "needs_attention": len(pending_rules) > 0,
        })

    # ordenar: atenção primeiro, depois mês desc
    result.sort(key=lambda x: (-int(x["needs_attention"]), -x["relative_month"]))

    summary = {
        "total": len(result),
        "needs_attention": sum(1 for p in result if p["needs_attention"]),
        "on_track": sum(1 for p in result if not p["needs_attention"]),
        "rules_total": len(rules),
    }

    return {"patients": result, "rules": rules, "summary": summary}


# ─── Aplicar Regras ──────────────────────────────────────────────────────────

@router.post("/admin/program/apply-rules")
async def apply_program_rules(
    body: ApplyRulesRequest,
    current_user: CurrentUser = Depends(get_current_user_with_db_role),
):
    """
    Aplica as regras do programa:
    - auto_activate=True: ativa automaticamente o protocolo para o paciente
    - auto_activate=False: apenas lista como pendente (admin ativa manualmente)

    dry_run=True: só simula, não ativa nada.
    """
    _require_pro(current_user)

    # Reusar o overview para descobrir quem precisa de atenção
    overview = await patients_overview(body.program_id, current_user)
    patients_data = overview["patients"]

    activated = []
    skipped_manual = []
    errors = []

    if not body.dry_run:
        # Importar função de ativação
        async with httpx.AsyncClient(timeout=30) as c:
            for patient in patients_data:
                for rule in patient["pending_rules"]:
                    if not rule.get("auto_activate"):
                        skipped_manual.append({
                            "patient_id": patient["patient_id"],
                            "patient_name": patient["full_name"],
                            "protocol_name": rule.get("protocol_name", "?"),
                            "trigger_month": rule["trigger_month"],
                        })
                        continue

                    # Ativar via endpoint existente
                    try:
                        act_resp = await c.post(
                            "http://localhost:8001/api/professional/protocols/activate",
                            headers={
                                "Authorization": f"Bearer {SERVICE_KEY}",
                                "Content-Type": "application/json",
                            },
                            json={
                                "patient_id": patient["patient_id"],
                                "protocol_id": rule["protocol_id"],
                            },
                        )
                        if act_resp.status_code in (200, 201):
                            activated.append({
                                "patient_id": patient["patient_id"],
                                "patient_name": patient["full_name"],
                                "protocol_name": rule.get("protocol_name", "?"),
                                "trigger_month": rule["trigger_month"],
                            })
                            logger.info(
                                f"✅ Auto-ativado: {rule.get('protocol_name')} → "
                                f"{patient['full_name']} (mês {rule['trigger_month']})"
                            )
                        else:
                            errors.append({
                                "patient_id": patient["patient_id"],
                                "patient_name": patient["full_name"],
                                "error": act_resp.text[:100],
                            })
                    except Exception as e:
                        errors.append({
                            "patient_id": patient["patient_id"],
                            "error": str(e)[:100],
                        })
    else:
        # Dry run: só categorizar
        for patient in patients_data:
            for rule in patient["pending_rules"]:
                if rule.get("auto_activate"):
                    activated.append({
                        "patient_id": patient["patient_id"],
                        "patient_name": patient["full_name"],
                        "protocol_name": rule.get("protocol_name", "?"),
                        "trigger_month": rule["trigger_month"],
                        "dry_run": True,
                    })
                else:
                    skipped_manual.append({
                        "patient_id": patient["patient_id"],
                        "patient_name": patient["full_name"],
                        "protocol_name": rule.get("protocol_name", "?"),
                        "trigger_month": rule["trigger_month"],
                    })

    return {
        "dry_run": body.dry_run,
        "activated_count": len(activated),
        "manual_pending_count": len(skipped_manual),
        "error_count": len(errors),
        "activated": activated,
        "manual_pending": skipped_manual,
        "errors": errors,
    }

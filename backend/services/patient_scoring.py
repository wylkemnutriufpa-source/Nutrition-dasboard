"""
patient_scoring.py
Score de Prioridade do Paciente (0-100)

Fórmula determinística e transparente:
  - checklist_adherence  → até 40 pontos  (checklist_tasks: completed/total, últimos 30 dias)
  - recency_login        → até 20 pontos  (auth.users last_sign_in_at via admin API)
  - feedback_recente     → até 10 pontos  (patient_feedbacks últimos 30 dias)
  - peso_recente         → até 10 pontos  (weight_history últimos 30 dias)
  - fotos_recentes       → até 10 pontos  (progress_photos últimos 30 dias)
  - protocolos_cumpridos → até 10 pontos  (patient_protocols ativos com tarefas completadas)

Faixas:
  80-100 → green  → Engajado
  50-79  → yellow → Atenção
  0-49   → red    → Risco alto

Se dado não existe, retorna pontuação neutra (metade do peso) para não penalizar.
"""

import os
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _headers():
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }


# ─── Configuração de pesos (fácil de ajustar) ─────────────────────────
WEIGHTS = {
    "checklist":  40,
    "login":      20,
    "feedback":   10,
    "peso":       10,
    "fotos":      10,
    "protocolos": 10,
}


# ─── Funções de cálculo por fator ─────────────────────────────────────

def _score_checklist(tasks: list) -> dict:
    """Até 40 pts. Proporção de tarefas completadas nos últimos 30 dias."""
    weight = WEIGHTS["checklist"]
    if not tasks:
        return {"score": 0, "max": weight, "detail": "Sem tarefas", "ratio": 0}
    total = len(tasks)
    completed = sum(1 for t in tasks if t.get("completed"))
    ratio = completed / total if total > 0 else 0
    return {
        "score": round(ratio * weight),
        "max": weight,
        "detail": f"{completed}/{total} concluídas",
        "ratio": round(ratio * 100),
    }


def _score_login(last_sign_in: Optional[str]) -> dict:
    """Até 20 pts. Decai conforme dias sem login."""
    weight = WEIGHTS["login"]
    if not last_sign_in:
        return {"score": 0, "max": weight, "detail": "Nunca logou", "days_ago": None}

    try:
        last_dt = datetime.fromisoformat(last_sign_in.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return {"score": 0, "max": weight, "detail": "Data inválida", "days_ago": None}

    days_ago = (datetime.now(timezone.utc) - last_dt).days

    if days_ago <= 1:
        pts = weight          # 20
    elif days_ago <= 3:
        pts = round(weight * 0.8)   # 16
    elif days_ago <= 7:
        pts = round(weight * 0.5)   # 10
    elif days_ago <= 14:
        pts = round(weight * 0.25)  # 5
    else:
        pts = 0

    return {
        "score": pts,
        "max": weight,
        "detail": f"{days_ago} dias sem login" if days_ago > 0 else "Login hoje",
        "days_ago": days_ago,
    }


def _score_feedback(feedbacks: list) -> dict:
    """Até 10 pts. Se enviou feedback nos últimos 14 dias, pontua."""
    weight = WEIGHTS["feedback"]
    if feedbacks is None:
        # Tabela vazia / sem dados → pontuação neutra
        return {"score": weight // 2, "max": weight, "detail": "Sem dados ainda", "count": 0}
    count = len(feedbacks)
    if count == 0:
        return {"score": 0, "max": weight, "detail": "Nenhum feedback recente", "count": 0}
    # 1+ feedback = full score
    pts = min(count * 5, weight)
    return {"score": pts, "max": weight, "detail": f"{count} feedbacks recentes", "count": count}


def _score_peso(records: list) -> dict:
    """Até 10 pts. Se atualizou peso nos últimos 14 dias."""
    weight = WEIGHTS["peso"]
    if records is None:
        return {"score": weight // 2, "max": weight, "detail": "Sem dados ainda", "count": 0}
    count = len(records)
    if count == 0:
        return {"score": 0, "max": weight, "detail": "Peso não atualizado", "count": 0}
    pts = min(count * 5, weight)
    return {"score": pts, "max": weight, "detail": f"{count} registros recentes", "count": count}


def _score_fotos(photos: list) -> dict:
    """Até 10 pts. Se enviou fotos nos últimos 30 dias."""
    weight = WEIGHTS["fotos"]
    if photos is None:
        return {"score": weight // 2, "max": weight, "detail": "Sem dados ainda", "count": 0}
    count = len(photos)
    if count == 0:
        return {"score": 0, "max": weight, "detail": "Sem fotos recentes", "count": 0}
    pts = min(count * 5, weight)
    return {"score": pts, "max": weight, "detail": f"{count} fotos recentes", "count": count}


def _score_protocolos(protocols: list, tasks: list) -> dict:
    """Até 10 pts. Se tem protocolo ativo e tarefas completadas."""
    weight = WEIGHTS["protocolos"]
    if protocols is None or not protocols:
        return {"score": weight // 2, "max": weight, "detail": "Sem protocolo ativo", "active": 0}
    active = len(protocols)
    # Se tem protocolo ativo, dá metade dos pontos
    # Se tem tarefas completadas do protocolo, dá pontos extras
    completed_tasks = sum(1 for t in (tasks or []) if t.get("completed"))
    total_tasks = len(tasks or [])
    if total_tasks > 0:
        ratio = completed_tasks / total_tasks
        pts = round(5 + ratio * 5)  # 5 base + até 5 por execução
    else:
        pts = 5  # Protocolo ativo sem tarefas → metade
    return {
        "score": min(pts, weight),
        "max": weight,
        "detail": f"{active} protocolo(s) ativo(s)",
        "active": active,
    }


# ─── Score principal ──────────────────────────────────────────────────

def _classify(score: int) -> dict:
    """Classifica score em faixa/status."""
    if score >= 80:
        return {"status": "green", "label": "Engajado", "level": "excellent"}
    elif score >= 50:
        return {"status": "yellow", "label": "Atenção", "level": "attention"}
    else:
        return {"status": "red", "label": "Risco alto", "level": "risk"}


def _generate_alerts(score: int, factors: dict) -> list:
    """Gera alertas acionáveis baseados nos fatores."""
    alerts = []

    checklist = factors.get("checklist", {})
    if checklist.get("ratio", 0) < 50 and checklist.get("score", 0) < checklist.get("max", 40):
        alerts.append({
            "type": "checklist",
            "severity": "high",
            "message": "Baixa adesão ao checklist",
        })

    login = factors.get("login", {})
    days = login.get("days_ago")
    if days is not None and days > 7:
        alerts.append({
            "type": "inactive",
            "severity": "critical" if days > 14 else "high",
            "message": f"{days} dias sem login",
        })

    if score < 40:
        alerts.append({
            "type": "risk",
            "severity": "critical",
            "message": "Risco alto de abandono",
        })

    return alerts


async def calculate_patient_score(patient_id: str, client: httpx.AsyncClient) -> dict:
    """
    Calcula o score de prioridade de um paciente.
    Retorna: {score, status, label, level, factors, alerts}
    """
    now = datetime.now(timezone.utc)
    last_30d = (now - timedelta(days=30)).isoformat()
    last_14d = (now - timedelta(days=14)).isoformat()
    h = _headers()

    # ── Queries paralelas via httpx ─────────────────────────────────
    # 1. Checklist tasks (últimos 30 dias)
    checklist_req = client.get(
        f"{SUPABASE_URL}/rest/v1/checklist_tasks",
        headers=h,
        params={"patient_id": f"eq.{patient_id}", "created_at": f"gte.{last_30d}", "select": "id,completed"},
    )
    # 2. Feedbacks (últimos 14 dias)
    feedback_req = client.get(
        f"{SUPABASE_URL}/rest/v1/patient_feedbacks",
        headers=h,
        params={"patient_id": f"eq.{patient_id}", "created_at": f"gte.{last_14d}", "select": "id"},
    )
    # 3. Weight history (últimos 14 dias)
    weight_req = client.get(
        f"{SUPABASE_URL}/rest/v1/weight_history",
        headers=h,
        params={"patient_id": f"eq.{patient_id}", "created_at": f"gte.{last_14d}", "select": "id"},
    )
    # 4. Progress photos (últimos 30 dias)
    photos_req = client.get(
        f"{SUPABASE_URL}/rest/v1/progress_photos",
        headers=h,
        params={"patient_id": f"eq.{patient_id}", "created_at": f"gte.{last_30d}", "select": "id"},
    )
    # 5. Active protocols
    protocols_req = client.get(
        f"{SUPABASE_URL}/rest/v1/patient_protocols",
        headers=h,
        params={"patient_id": f"eq.{patient_id}", "status": "eq.active", "select": "id,protocol_id"},
    )
    # 6. Login info from auth admin
    login_req = client.get(
        f"{SUPABASE_URL}/auth/v1/admin/users/{patient_id}",
        headers=h,
    )

    # Executar todas as queries
    results = await asyncio.gather(
        checklist_req, feedback_req, weight_req, photos_req, protocols_req, login_req,
        return_exceptions=True,
    )

    def safe_json(resp, default=None):
        if isinstance(resp, Exception):
            return default
        try:
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
        return default

    checklist_data = safe_json(results[0], [])
    feedback_data = safe_json(results[1], None)
    weight_data = safe_json(results[2], None)
    photos_data = safe_json(results[3], None)
    protocols_data = safe_json(results[4], [])

    login_info = safe_json(results[5], {})
    last_sign_in = login_info.get("last_sign_in_at")

    # ── Calcular cada fator ─────────────────────────────────────────
    f_checklist = _score_checklist(checklist_data if isinstance(checklist_data, list) else [])
    f_login = _score_login(last_sign_in)
    f_feedback = _score_feedback(feedback_data)
    f_peso = _score_peso(weight_data)
    f_fotos = _score_fotos(photos_data)
    f_protocolos = _score_protocolos(protocols_data, checklist_data if isinstance(checklist_data, list) else [])

    # ── Score total ─────────────────────────────────────────────────
    total_score = min(100, max(0,
        f_checklist["score"]
        + f_login["score"]
        + f_feedback["score"]
        + f_peso["score"]
        + f_fotos["score"]
        + f_protocolos["score"]
    ))

    classification = _classify(total_score)
    factors = {
        "checklist": f_checklist,
        "login": f_login,
        "feedback": f_feedback,
        "peso": f_peso,
        "fotos": f_fotos,
        "protocolos": f_protocolos,
    }
    alerts = _generate_alerts(total_score, factors)

    return {
        "patient_id": patient_id,
        "score": total_score,
        **classification,
        "factors": factors,
        "alerts": alerts,
    }


async def calculate_batch_scores(patient_ids: list[str]) -> dict:
    """
    Calcula scores para múltiplos pacientes.
    Retorna: {patient_id: {score, status, ...}, ...}
    """
    import asyncio

    async with httpx.AsyncClient(timeout=15.0) as client:
        tasks = [calculate_patient_score(pid, client) for pid in patient_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    scores = {}
    for pid, result in zip(patient_ids, results):
        if isinstance(result, Exception):
            scores[pid] = {
                "patient_id": pid,
                "score": 0,
                "status": "gray",
                "label": "Erro",
                "level": "unknown",
                "factors": {},
                "alerts": [],
            }
        else:
            scores[pid] = result
    return scores


# Precisa de asyncio para gather
import asyncio

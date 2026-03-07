"""
Timeline Helpers – registro best-effort de eventos na patient_timeline_events.

Uso:
    from utils.timeline_helpers import record_timeline_event

    await record_timeline_event(
        patient_id="uuid-do-paciente",
        event_type="protocol_scheduled",
        payload={"protocol_name": "Emagrecimento", "start_date": "2025-07-20"},
    )

Nunca levanta exceção — falhas são logadas como warning e silenciadas.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Dict

import httpx

logger = logging.getLogger(__name__)

_SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _headers() -> Dict[str, str]:
    return {
        "apikey": _SERVICE_KEY,
        "Authorization": f"Bearer {_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


async def record_timeline_event(
    patient_id: str,
    event_type: str,
    payload: Dict[str, Any] | None = None,
) -> bool:
    """
    Insere um evento na tabela patient_timeline_events.

    - Best-effort: captura qualquer exceção e retorna False em caso de falha.
    - Não bloqueia o fluxo principal.

    Args:
        patient_id:  UUID do paciente (destino do evento).
        event_type:  Tipo do evento (ex: 'protocol_scheduled').
        payload:     Dados adicionais do evento (dict JSON-serializável).

    Returns:
        True se inserido com sucesso, False caso contrário.
    """
    if not _SUPABASE_URL or not _SERVICE_KEY:
        logger.warning("⚠️ record_timeline_event: SUPABASE_URL ou SERVICE_KEY não configurados")
        return False

    body = {
        "patient_id": patient_id,
        "event_type": event_type,
        "payload":    payload or {},
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{_SUPABASE_URL}/rest/v1/patient_timeline_events",
                headers=_headers(),
                json=body,
            )
            if resp.status_code in (200, 201):
                logger.info(f"📅 timeline event recorded: {event_type} → patient {patient_id[:8]}…")
                return True
            else:
                logger.warning(
                    f"⚠️ record_timeline_event: status {resp.status_code} para {event_type} "
                    f"(patient {patient_id[:8]}…): {resp.text[:120]}"
                )
                return False
    except Exception as exc:
        logger.warning(f"⚠️ record_timeline_event falhou silenciosamente ({event_type}): {exc}")
        return False

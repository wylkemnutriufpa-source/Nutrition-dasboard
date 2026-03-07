"""
Patient Scoring Routes
Endpoints para calcular e consultar o Score de Prioridade do Paciente.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from security.auth import get_current_user, require_role
from services.patient_scoring import calculate_patient_score, calculate_batch_scores
import httpx

router = APIRouter(prefix="/scoring", tags=["patient-scoring"])


class BatchScoreRequest(BaseModel):
    patient_ids: List[str]


@router.get("/patients/{patient_id}/score")
async def get_patient_score(
    patient_id: str,
    current_user=Depends(get_current_user),
):
    """Score de prioridade de um único paciente."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        result = await calculate_patient_score(patient_id, client)
    return result


@router.post("/patients/scores")
async def get_batch_scores(
    request: BatchScoreRequest,
    current_user=Depends(get_current_user),
):
    """Score de prioridade em lote (para lista de pacientes)."""
    if len(request.patient_ids) > 100:
        raise HTTPException(status_code=400, detail="Máximo 100 pacientes por requisição")
    if not request.patient_ids:
        return {}
    result = await calculate_batch_scores(request.patient_ids)
    return result

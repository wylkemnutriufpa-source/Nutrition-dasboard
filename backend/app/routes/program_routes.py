"""
Rotas para insights de programas (Projeto Biquíni Branco).
Migrado da edge function program-insights.
"""

import json
import logging
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import get_current_user, require_role, AuthenticatedUser
from app.services.ai_service import call_openai

router = APIRouter()
logger = logging.getLogger("app.program_routes")


class ProgramInsightsRequest(BaseModel):
    patient_name: str
    current_phase: str
    weight_history: List[float] = []
    waist_history: List[float] = []
    adherence_history: List[int] = []
    habits_data: Dict[str, Any] = {}
    anamnesis_summary: Optional[str] = None


class ProgramInsightsResponse(BaseModel):
    overall_status: str  # "on_track" | "attention" | "at_risk"
    status_label: str
    insights: List[str]
    recommendations: List[str]
    phase_advice: str
    motivation_message: str


@router.post("/program-insights", response_model=ProgramInsightsResponse)
async def get_program_insights(
    payload: ProgramInsightsRequest,
    user: AuthenticatedUser = Depends(require_role(["nutritionist", "admin"])),
):
    """Generate AI-powered insights for a patient in a program."""
    
    system_prompt = """Você é um assistente de IA especializado em nutrição e transformação corporal feminina, integrado ao programa "Projeto Biquíni Branco".

Seu papel é analisar os dados de progresso da paciente e gerar insights clínicos personalizados.

Responda SEMPRE em português brasileiro. Seja objetivo e profissional."""

    user_prompt = f"""Analise os dados da paciente "{payload.patient_name}" no Projeto Biquíni Branco:

Fase atual: {payload.current_phase}
Histórico de peso (últimas semanas): {json.dumps(payload.weight_history)}
Histórico de cintura (cm): {json.dumps(payload.waist_history)}
Histórico de adesão (%): {json.dumps(payload.adherence_history)}
Hábitos completados: {json.dumps(payload.habits_data)}
Resumo da anamnese: {payload.anamnesis_summary or "Não disponível"}

Gere um JSON com a seguinte estrutura:
{{
  "overall_status": "on_track" | "attention" | "at_risk",
  "status_label": "No caminho certo" | "Precisa de atenção" | "Risco de estagnação",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recomendação 1", "recomendação 2"],
  "phase_advice": "conselho específico para a fase atual",
  "motivation_message": "mensagem motivacional personalizada"
}}"""

    try:
        raw = await call_openai(prompt=user_prompt, system_prompt=system_prompt)
        
        # Parse JSON from AI response
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        
        result = json.loads(raw.strip())
        
        return ProgramInsightsResponse(
            overall_status=result.get("overall_status", "attention"),
            status_label=result.get("status_label", "Análise em andamento"),
            insights=result.get("insights", ["Continue seguindo o plano alimentar"]),
            recommendations=result.get("recommendations", ["Mantenha a consistência"]),
            phase_advice=result.get("phase_advice", "Mantenha o foco nesta fase"),
            motivation_message=result.get("motivation_message", "Cada dia é uma nova oportunidade! 💪"),
        )
        
    except json.JSONDecodeError:
        logger.warning("AI returned non-JSON for program insights")
        return ProgramInsightsResponse(
            overall_status="attention",
            status_label="Dados insuficientes",
            insights=["Registre mais dados para insights personalizados"],
            recommendations=["Continue seguindo o plano alimentar"],
            phase_advice="Mantenha a consistência",
            motivation_message="Cada dia é uma nova oportunidade! 💪",
        )
    except Exception as e:
        logger.exception(f"Error generating program insights: {e}")
        raise HTTPException(500, f"Erro ao gerar insights: {str(e)}")

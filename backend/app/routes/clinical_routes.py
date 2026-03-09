"""
Rotas para insights clínicos do dashboard.
Migrado da edge function clinical-insights.
"""

import json
import logging
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import get_current_user, require_role, AuthenticatedUser
from app.services.ai_service import call_openai

router = APIRouter()
logger = logging.getLogger("app.clinical_routes")


class PatientAttention(BaseModel):
    patient_id: str
    patient_name: str
    reason: str
    priority: str  # "high" | "medium" | "low"
    action_suggested: Optional[str] = None


class ClinicalInsight(BaseModel):
    title: str
    description: str
    category: str  # "sleep" | "metabolism" | "nutrition" | "adherence" | "risk" | "progress"
    affected_count: Optional[int] = None
    severity: str  # "info" | "warning" | "critical"


class InsightSummary(BaseModel):
    total_analyzed: int
    high_risk_count: int
    avg_adherence_estimate: Optional[int] = None
    top_concern: str


class ClinicalInsightsRequest(BaseModel):
    patients: List[Dict[str, Any]]


class ClinicalInsightsResponse(BaseModel):
    attention_needed: List[PatientAttention]
    insights: List[ClinicalInsight]
    summary: InsightSummary


@router.post("/clinical-insights", response_model=ClinicalInsightsResponse)
async def get_clinical_insights(
    payload: ClinicalInsightsRequest,
    user: AuthenticatedUser = Depends(require_role(["nutritionist", "admin"])),
):
    """Generate AI-powered clinical insights for the nutritionist dashboard."""
    
    if not payload.patients:
        return ClinicalInsightsResponse(
            attention_needed=[],
            insights=[],
            summary=InsightSummary(
                total_analyzed=0,
                high_risk_count=0,
                top_concern="Nenhum paciente para analisar"
            )
        )
    
    prompt = f"""Você é um assistente clínico de nutrição. Analise os dados dos pacientes abaixo e gere insights clínicos acionáveis.

DADOS DOS PACIENTES:
{json.dumps(payload.patients, ensure_ascii=False, indent=2)}

Gere insights em formato JSON com a estrutura abaixo. Retorne SOMENTE o JSON, sem markdown.

{{
  "attention_needed": [
    {{
      "patient_id": "id do paciente",
      "patient_name": "nome do paciente",
      "reason": "motivo da atenção",
      "priority": "high|medium|low",
      "action_suggested": "ação sugerida"
    }}
  ],
  "insights": [
    {{
      "title": "título do insight",
      "description": "descrição detalhada",
      "category": "sleep|metabolism|nutrition|adherence|risk|progress",
      "affected_count": 0,
      "severity": "info|warning|critical"
    }}
  ],
  "summary": {{
    "total_analyzed": {len(payload.patients)},
    "high_risk_count": 0,
    "avg_adherence_estimate": 75,
    "top_concern": "principal preocupação"
  }}
}}"""

    try:
        raw = await call_openai(
            prompt=prompt,
            system_prompt="You are a clinical nutrition AI assistant. Always respond in Brazilian Portuguese. Return valid JSON only."
        )
        
        # Parse JSON from AI response
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        
        result = json.loads(raw.strip())
        
        attention_needed = [
            PatientAttention(**item) for item in result.get("attention_needed", [])
        ]
        
        insights = [
            ClinicalInsight(**item) for item in result.get("insights", [])
        ]
        
        summary_data = result.get("summary", {})
        summary = InsightSummary(
            total_analyzed=summary_data.get("total_analyzed", len(payload.patients)),
            high_risk_count=summary_data.get("high_risk_count", 0),
            avg_adherence_estimate=summary_data.get("avg_adherence_estimate"),
            top_concern=summary_data.get("top_concern", "Nenhuma preocupação identificada")
        )
        
        return ClinicalInsightsResponse(
            attention_needed=attention_needed,
            insights=insights,
            summary=summary
        )
        
    except json.JSONDecodeError:
        logger.warning("AI returned non-JSON for clinical insights")
        return ClinicalInsightsResponse(
            attention_needed=[],
            insights=[
                ClinicalInsight(
                    title="Análise em processamento",
                    description="Colete mais dados dos pacientes para insights personalizados",
                    category="progress",
                    severity="info"
                )
            ],
            summary=InsightSummary(
                total_analyzed=len(payload.patients),
                high_risk_count=0,
                top_concern="Dados insuficientes para análise completa"
            )
        )
    except Exception as e:
        logger.exception(f"Error generating clinical insights: {e}")
        raise HTTPException(500, f"Erro ao gerar insights clínicos: {str(e)}")

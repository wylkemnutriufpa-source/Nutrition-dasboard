"""
Rotas de análise por IA.
Todos os inputs são validados via Pydantic.
Respostas são sanitizadas antes de retornar.
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import get_current_user, require_role, AuthenticatedUser
from app.schemas.ai_schemas import (
    MealAnalysisRequest,
    MealAnalysisResponse,
    BodyAnalysisRequest,
    BodyAnalysisResponse,
    AnamnesisAnalysisRequest,
    AnamnesisAnalysisResponse,
    GenerateRecipeRequest,
    GenerateRecipeResponse,
)
from app.services.ai_service import call_openai
from app.services.supabase_client import get_supabase

router = APIRouter()
logger = logging.getLogger("app.ai_routes")


@router.post("/analyze-meal", response_model=MealAnalysisResponse)
async def analyze_meal(
    payload: MealAnalysisRequest,
    user: AuthenticatedUser = Depends(require_role(["patient", "nutritionist", "admin"])),
):
    prompt = f"Analise nutricionalmente esta refeição: {payload.description}"
    if payload.image_url:
        prompt += f"\nImagem: {payload.image_url}"
    analysis = await call_openai(
        prompt=prompt,
        system_prompt="Você é um nutricionista. Responda em português com análise calórica e de macronutrientes.",
    )
    return MealAnalysisResponse(analysis=analysis)


@router.post("/analyze-body", response_model=BodyAnalysisResponse)
async def analyze_body(
    payload: BodyAnalysisRequest,
    user: AuthenticatedUser = Depends(require_role(["patient", "nutritionist", "admin"])),
):
    bmi = payload.weight_kg / ((payload.height_cm / 100) ** 2)
    prompt = f"Paciente: {payload.height_cm}cm, {payload.weight_kg}kg, IMC {bmi:.1f}."
    if payload.notes:
        prompt += f" Observações: {payload.notes}"
    analysis = await call_openai(
        prompt=prompt,
        system_prompt="Você é um nutricionista. Dê recomendações em português.",
    )
    return BodyAnalysisResponse(bmi=round(bmi, 2), analysis=analysis)


@router.post("/analyze-anamnesis", response_model=AnamnesisAnalysisResponse)
async def analyze_anamnesis(
    payload: AnamnesisAnalysisRequest,
    user: AuthenticatedUser = Depends(require_role(["patient", "nutritionist", "admin"])),
):
    """Analisa anamnese com IA e retorna diagnóstico estruturado."""
    db = get_supabase()

    # Fetch anamnesis
    result = db.table("patient_anamnesis").select("*").eq("id", payload.anamnesis_id).single().execute()
    if not result.data:
        raise HTTPException(404, "Anamnese não encontrada")

    anamnesis = result.data
    answers = anamnesis.get("answers", {})

    prompt = f"""Analise esta anamnese nutricional e forneça um diagnóstico clínico:

RESPOSTAS DO PACIENTE:
{json.dumps(answers, ensure_ascii=False, indent=2)}

DADOS CALCULADOS:
- TMB: {anamnesis.get('computed_tmb')} kcal
- Meta Calórica: {anamnesis.get('computed_kcal_target')} kcal/dia
- Proteína: {anamnesis.get('computed_protein')}g
- Carboidratos: {anamnesis.get('computed_carbs')}g
- Gorduras: {anamnesis.get('computed_fat')}g

Responda APENAS com JSON válido neste formato exato:
{{
  "summary": "resumo clínico em 2-3 frases",
  "risk_level": "low|medium|high",
  "tips": ["dica 1", "dica 2", "dica 3"],
  "recommendations": ["recomendação 1", "recomendação 2"],
  "initial_focus": ["foco 1", "foco 2"]
}}"""

    raw = await call_openai(
        prompt=prompt,
        system_prompt="Você é um nutricionista clínico especializado. Responda sempre em português com JSON válido.",
    )

    # Parse JSON from AI response
    try:
        # Extract JSON block if wrapped in markdown code block
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        ai_data = json.loads(raw.strip())
    except Exception:
        logger.warning("AI returned non-JSON, using fallback: %s", raw[:200])
        ai_data = {
            "summary": raw[:300],
            "risk_level": "medium",
            "tips": [],
            "recommendations": [],
            "initial_focus": [],
        }

    tips = ai_data.get("tips", [])
    recommendations = ai_data.get("recommendations", [])

    # Update anamnesis record with AI analysis (service role bypasses RLS)
    db.table("patient_anamnesis").update({
        "status": "completed",
    }).eq("id", payload.anamnesis_id).execute()

    return AnamnesisAnalysisResponse(
        summary=ai_data.get("summary", "Análise concluída"),
        risk_level=ai_data.get("risk_level", "medium"),
        tips_count=len(tips),
        recommendations_count=len(recommendations),
        tips=tips,
        recommendations=recommendations,
        initial_focus=ai_data.get("initial_focus", []),
    )


@router.post("/generate-recipe", response_model=GenerateRecipeResponse)
async def generate_recipe(
    payload: GenerateRecipeRequest,
    user: AuthenticatedUser = Depends(require_role(["nutritionist", "admin"])),
):
    """Gera receita com IA e salva no banco de dados."""
    prompt = f"""Crie uma receita completa baseada nesta solicitação: {payload.prompt}

Responda APENAS com JSON válido neste formato:
{{
  "title": "Nome da Receita",
  "description": "Descrição breve",
  "category": "breakfast|main|snack|dessert|soup|salad",
  "difficulty": "easy|medium|hard",
  "prep_time_minutes": 15,
  "cook_time_minutes": 30,
  "servings": 2,
  "ingredients": [
    {{"name": "ingrediente", "amount": "100g"}}
  ],
  "instructions": ["passo 1", "passo 2", "passo 3"],
  "calories_per_serving": 350,
  "protein_per_serving": 25,
  "carbs_per_serving": 40,
  "fat_per_serving": 10,
  "tags": ["tag1", "tag2"]
}}"""

    raw = await call_openai(
        prompt=prompt,
        system_prompt="Você é um chef nutricionista. Crie receitas saudáveis e deliciosas. Responda apenas com JSON válido.",
    )

    try:
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        recipe_data = json.loads(raw.strip())
    except Exception:
        logger.warning("AI recipe returned non-JSON: %s", raw[:200])
        raise HTTPException(500, "Erro ao processar receita gerada pela IA")

    db = get_supabase()
    insert_data = {
        "nutritionist_id": payload.nutritionist_id,
        "title": recipe_data.get("title", "Receita sem nome"),
        "description": recipe_data.get("description", ""),
        "category": recipe_data.get("category", "main"),
        "difficulty": recipe_data.get("difficulty", "medium"),
        "prep_time_minutes": recipe_data.get("prep_time_minutes", 15),
        "cook_time_minutes": recipe_data.get("cook_time_minutes", 30),
        "servings": recipe_data.get("servings", 2),
        "ingredients": recipe_data.get("ingredients", []),
        "instructions": recipe_data.get("instructions", []),
        "calories_per_serving": recipe_data.get("calories_per_serving"),
        "protein_per_serving": recipe_data.get("protein_per_serving"),
        "carbs_per_serving": recipe_data.get("carbs_per_serving"),
        "fat_per_serving": recipe_data.get("fat_per_serving"),
        "tags": recipe_data.get("tags", []),
        "is_ai_generated": True,
        "is_shared": False,
    }

    result = db.table("recipes").insert(insert_data).execute()
    if not result.data:
        raise HTTPException(500, "Erro ao salvar receita")

    return GenerateRecipeResponse(
        recipe_id=result.data[0]["id"],
        title=insert_data["title"],
        message="Receita gerada com sucesso!",
    )

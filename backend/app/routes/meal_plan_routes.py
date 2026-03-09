"""
Rotas para geração de plano alimentar com IA.
Migrado da edge function generate-meal-plan.
"""

import json
import logging
from typing import Optional, List, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import get_current_user, require_role, AuthenticatedUser
from app.services.supabase_client import get_supabase
from app.services.ai_service import call_openai

router = APIRouter()
logger = logging.getLogger("app.meal_plan_routes")


class GenerateMealPlanRequest(BaseModel):
    patient_id: str
    meal_plan_id: str


class GenerateMealPlanResponse(BaseModel):
    success: bool
    items_count: int
    tips_count: int
    macros: Dict[str, int]
    data_source: str
    ai_personalized: bool
    insight_used: Optional[Dict[str, Any]] = None


# ──── Food database (Brazilian foods) with tags for AI matching ────
FOODS = {
    "breakfast": [
        {"title": "Pão integral com queijo", "desc": "2 fatias de pão integral + 2 fatias de queijo branco", "kcal": 250, "p": 12, "c": 30, "f": 8, "tags": ["quick"], "subs": ["Tapioca com queijo", "Crepioca"], "benefits": ["fibra", "energia_matinal", "saciedade"]},
        {"title": "Mingau de aveia com banana", "desc": "40g aveia + 1 banana + 200ml leite", "kcal": 320, "p": 10, "c": 50, "f": 8, "tags": ["homemade"], "subs": ["Overnight oats", "Vitamina de frutas"], "benefits": ["fibra", "digestão", "energia_sustentada", "saciedade"]},
        {"title": "Ovos mexidos com torrada", "desc": "2 ovos mexidos + 2 torradas integrais", "kcal": 280, "p": 18, "c": 22, "f": 14, "tags": ["quick", "low_carb"], "subs": ["Omelete", "Ovo cozido com pão"], "benefits": ["proteína", "saciedade", "low_carb", "massa_muscular"]},
        {"title": "Iogurte com granola", "desc": "200ml iogurte natural + 30g granola + frutas", "kcal": 260, "p": 10, "c": 38, "f": 6, "tags": ["quick"], "subs": ["Açaí com granola", "Smoothie bowl"], "benefits": ["probiótico", "digestão", "imunidade", "praticidade"]},
        {"title": "Smoothie verde proteico", "desc": "Espinafre + banana + whey + leite vegetal", "kcal": 290, "p": 22, "c": 32, "f": 6, "tags": ["quick"], "subs": ["Vitamina verde", "Shake detox"], "benefits": ["anti_inflamatório", "energia", "proteína", "micronutrientes"]},
        {"title": "Tapioca com ovo e tomate", "desc": "1 tapioca + 2 ovos + tomate picado", "kcal": 270, "p": 16, "c": 28, "f": 10, "tags": ["quick", "gluten_free"], "subs": ["Crepioca", "Panqueca de banana"], "benefits": ["sem_glúten", "proteína", "energia_rápida"]},
    ],
    "morning_snack": [
        {"title": "Fruta + castanhas", "desc": "1 maçã + 5 castanhas do Pará", "kcal": 180, "p": 4, "c": 22, "f": 10, "tags": ["quick"], "subs": ["Banana + amendoim", "Mix de nuts"], "benefits": ["selênio", "antioxidante", "saciedade", "gordura_boa"]},
        {"title": "Iogurte grego", "desc": "170g iogurte grego + mel", "kcal": 150, "p": 12, "c": 16, "f": 4, "tags": ["quick"], "subs": ["Coalhada", "Vitamina"], "benefits": ["probiótico", "proteína", "digestão", "saciedade"]},
        {"title": "Sanduíche natural", "desc": "Pão de forma + frango desfiado + alface", "kcal": 200, "p": 14, "c": 20, "f": 6, "tags": ["homemade"], "subs": ["Wrap integral", "Torrada com pasta de atum"], "benefits": ["proteína", "fibra", "saciedade"]},
        {"title": "Mix de frutas secas e sementes", "desc": "30g mix de frutas secas + sementes de abóbora", "kcal": 160, "p": 5, "c": 18, "f": 8, "tags": ["quick"], "subs": ["Barra de cereais caseira", "Trail mix"], "benefits": ["energia_sustentada", "fibra", "minerais", "praticidade"]},
    ],
    "lunch": [
        {"title": "Arroz + feijão + frango grelhado", "desc": "100g arroz + 80g feijão + 120g frango + salada", "kcal": 480, "p": 35, "c": 55, "f": 10, "tags": ["homemade"], "subs": ["Arroz + lentilha + peixe", "Arroz + feijão + carne moída"], "benefits": ["proteína", "ferro", "fibra", "completo"]},
        {"title": "Macarrão integral com carne", "desc": "100g macarrão integral + molho + 100g carne moída magra", "kcal": 450, "p": 28, "c": 52, "f": 12, "tags": ["homemade"], "subs": ["Lasanha light", "Espaguete com frango"], "benefits": ["fibra", "proteína", "energia_sustentada"]},
        {"title": "Bowl de frango com legumes", "desc": "120g frango + quinoa + legumes salteados", "kcal": 420, "p": 32, "c": 40, "f": 12, "tags": ["gourmet"], "subs": ["Buddha bowl", "Salada completa com proteína"], "benefits": ["proteína", "micronutrientes", "anti_inflamatório", "low_carb"]},
        {"title": "Peixe assado com purê", "desc": "150g tilápia + purê de batata doce + brócolis", "kcal": 400, "p": 30, "c": 42, "f": 8, "tags": ["homemade"], "subs": ["Salmão grelhado", "Atum com batata"], "benefits": ["ômega3", "anti_inflamatório", "proteína", "digestão"]},
        {"title": "Salada completa com grão-de-bico", "desc": "Folhas verdes + grão-de-bico + ovo cozido + azeite", "kcal": 380, "p": 22, "c": 35, "f": 16, "tags": ["quick"], "subs": ["Salada com lentilha", "Tabule com proteína"], "benefits": ["fibra", "proteína_vegetal", "saciedade", "digestão"]},
        {"title": "Strogonoff light de frango", "desc": "120g frango + creme de leite light + arroz integral", "kcal": 460, "p": 30, "c": 48, "f": 14, "tags": ["homemade"], "subs": ["Frango ao molho mostarda", "Escondidinho light"], "benefits": ["proteína", "conforto", "saciedade"]},
    ],
    "afternoon_snack": [
        {"title": "Banana com pasta de amendoim", "desc": "1 banana + 1 colher de pasta de amendoim", "kcal": 220, "p": 6, "c": 28, "f": 10, "tags": ["quick"], "subs": ["Torrada com abacate", "Frutas com chocolate amargo"], "benefits": ["energia_rápida", "gordura_boa", "saciedade", "pré_treino"]},
        {"title": "Batata doce com canela", "desc": "100g batata doce cozida + canela", "kcal": 130, "p": 2, "c": 28, "f": 0, "tags": ["quick"], "subs": ["Mandioca cozida", "Milho cozido"], "benefits": ["energia_sustentada", "fibra", "anti_inflamatório", "pré_treino"]},
        {"title": "Shake proteico", "desc": "1 scoop whey + 200ml leite + 1 banana", "kcal": 280, "p": 26, "c": 30, "f": 6, "tags": ["quick"], "subs": ["Vitamina proteica", "Iogurte com whey"], "benefits": ["proteína", "massa_muscular", "recuperação", "pós_treino"]},
        {"title": "Torrada com abacate e ovo", "desc": "2 torradas + ½ abacate + 1 ovo cozido", "kcal": 260, "p": 12, "c": 22, "f": 16, "tags": ["quick"], "subs": ["Guacamole com torrada", "Abacate com granola"], "benefits": ["gordura_boa", "saciedade", "energia_sustentada", "hormonal"]},
    ],
    "dinner": [
        {"title": "Sopa de legumes com frango", "desc": "Caldo de legumes com 100g frango desfiado", "kcal": 280, "p": 22, "c": 25, "f": 8, "tags": ["homemade"], "subs": ["Creme de abóbora", "Sopa de lentilha"], "benefits": ["digestão", "leve", "hidratação", "anti_inflamatório", "sono"]},
        {"title": "Omelete de legumes + salada", "desc": "3 ovos + legumes + salada verde", "kcal": 300, "p": 22, "c": 10, "f": 18, "tags": ["quick", "low_carb"], "subs": ["Crepioca", "Wrap de ovo"], "benefits": ["low_carb", "proteína", "saciedade", "leve"]},
        {"title": "Salada completa com atum", "desc": "Folhas verdes + atum + grão-de-bico + tomate", "kcal": 320, "p": 26, "c": 22, "f": 12, "tags": ["quick"], "subs": ["Salada com frango", "Salada com salmão"], "benefits": ["ômega3", "proteína", "leve", "digestão"]},
        {"title": "Frango grelhado com legumes", "desc": "120g frango + abobrinha + cenoura refogada", "kcal": 310, "p": 28, "c": 18, "f": 10, "tags": ["homemade"], "subs": ["Peixe com legumes", "Carne magra com salada"], "benefits": ["proteína", "micronutrientes", "leve", "massa_muscular"]},
    ],
    "evening_snack": [
        {"title": "Chá + torrada integral", "desc": "Chá de camomila + 1 torrada com requeijão light", "kcal": 100, "p": 4, "c": 14, "f": 3, "tags": ["quick"], "subs": ["Leite quente com canela", "Chá com biscoito integral"], "benefits": ["sono", "relaxamento", "leve", "digestão"]},
        {"title": "Frutas vermelhas", "desc": "100g morango + mirtilo", "kcal": 60, "p": 1, "c": 14, "f": 0, "tags": ["quick"], "subs": ["Gelatina zero", "Maçã assada com canela"], "benefits": ["antioxidante", "anti_inflamatório", "leve", "imunidade"]},
        {"title": "Leite morno com cúrcuma", "desc": "200ml leite + ½ colher de cúrcuma + mel", "kcal": 120, "p": 6, "c": 16, "f": 4, "tags": ["quick"], "subs": ["Golden milk vegetal", "Chá de ervas com mel"], "benefits": ["anti_inflamatório", "sono", "imunidade", "relaxamento"]},
    ],
}

MEAL_KCAL_SPLIT = {
    "breakfast": 0.2,
    "morning_snack": 0.1,
    "lunch": 0.3,
    "afternoon_snack": 0.1,
    "dinner": 0.22,
    "evening_snack": 0.08,
}


def map_insights_to_benefits(insights: dict) -> List[str]:
    """Map AI insights to food benefit keywords."""
    benefits = []
    focuses = [
        *(insights.get("nutrition_focus") or []),
        *(insights.get("behavior_focus") or []),
        *(insights.get("movement_focus") or []),
        *(insights.get("main_pains") or []),
    ]
    text = " ".join(str(s).lower() for s in focuses)
    
    import re
    if re.search(r"proteín|massa muscular|hipertrofia|ganho", text):
        benefits.extend(["proteína", "massa_muscular"])
    if re.search(r"fibra|intestin|digestão|constipação", text):
        benefits.extend(["fibra", "digestão", "probiótico"])
    if re.search(r"inflama|dor|articular|inchaço", text):
        benefits.extend(["anti_inflamatório", "ômega3"])
    if re.search(r"sono|dormir|insônia|descanso", text):
        benefits.extend(["sono", "relaxamento"])
    if re.search(r"energia|dispos|cansaço|fadiga", text):
        benefits.extend(["energia_sustentada", "energia_rápida"])
    if re.search(r"saciedade|fome|compulsão|ansiedade", text):
        benefits.extend(["saciedade", "gordura_boa", "fibra"])
    if re.search(r"imunidade|defesa|gripe", text):
        benefits.extend(["imunidade", "antioxidante", "micronutrientes"])
    if re.search(r"emagre|perda|gordura corporal|déficit", text):
        benefits.extend(["low_carb", "saciedade", "leve"])
    if re.search(r"hidrat|água|líquido", text):
        benefits.append("hidratação")
    if re.search(r"treino|exercício|atividade física|musculação", text):
        benefits.extend(["pré_treino", "pós_treino", "recuperação"])
    if re.search(r"hormonal|tireóide|menopausa", text):
        benefits.extend(["hormonal", "anti_inflamatório", "micronutrientes"])
    if re.search(r"glúten", text):
        benefits.append("sem_glúten")
    
    return list(set(benefits))


def score_food_for_insights(food: dict, priority_benefits: List[str]) -> int:
    """Score food based on AI insights."""
    if not priority_benefits:
        return 0
    score = 0
    for b in food.get("benefits", []):
        if b in priority_benefits:
            score += 2
    return score


def generate_insight_note(food: dict, insights: dict) -> str:
    """Generate personalized note based on insights."""
    insights_text = json.dumps(insights).lower()
    matched = [b for b in food.get("benefits", []) if b.replace("_", " ") in insights_text]
    
    if not matched:
        return ""
    
    labels = {
        "proteína": "🔋 Rico em proteína para seus objetivos",
        "fibra": "🌾 Fonte de fibra para saúde digestiva",
        "digestão": "🫄 Favorece a digestão",
        "anti_inflamatório": "🍃 Propriedades anti-inflamatórias",
        "saciedade": "✅ Aumenta a saciedade",
        "energia_sustentada": "⚡ Energia de longa duração",
        "sono": "😴 Favorece o sono reparador",
        "ômega3": "🐟 Fonte de ômega-3",
        "imunidade": "🛡️ Fortalece a imunidade",
        "low_carb": "📉 Baixo carboidrato",
        "massa_muscular": "💪 Suporte para massa muscular",
        "probiótico": "🦠 Rico em probióticos",
        "gordura_boa": "🥑 Gorduras saudáveis",
        "antioxidante": "🫐 Rico em antioxidantes",
    }
    
    notes = [labels.get(b) for b in matched[:2] if labels.get(b)]
    if notes:
        return f"\n\n💡 Personalizado para você:\n" + "\n".join(notes)
    return ""


def generate_plan(answers: dict, kcal_target: int, protein: int, carbs: int, fat: int, insights: Optional[dict]) -> List[dict]:
    """Generate 7-day meal plan based on anamnesis and AI insights."""
    meal_types = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"]
    
    restrictions = answers.get("restrictions") or []
    cook_pref = answers.get("cooking_preference") or "any"
    disliked = [s.strip().lower() for s in (answers.get("disliked_foods") or "").split(",") if s.strip()]
    favorites = [s.strip().lower() for s in (answers.get("favorite_foods") or "").split(",") if s.strip()]
    
    priority_benefits = map_insights_to_benefits(insights) if insights else []
    
    items = []
    
    for day in range(7):
        for meal_type in meal_types:
            foods = FOODS.get(meal_type, [])
            candidates = []
            
            for f in foods:
                # Filter by cooking preference
                if cook_pref != "any" and cook_pref not in f.get("tags", []) and "quick" not in f.get("tags", []):
                    continue
                
                desc_lower = f.get("desc", "").lower()
                # Filter by restrictions
                if "vegetarian" in restrictions and any(m in desc_lower for m in ["frango", "carne", "atum", "peixe", "tilápia", "salmão", "sardinha"]):
                    continue
                if "vegan" in restrictions and any(m in desc_lower for m in ["frango", "carne", "atum", "peixe", "ovo", "leite", "queijo", "iogurte", "whey", "requeijão"]):
                    continue
                if "gluten_free" in restrictions and any(m in desc_lower for m in ["pão", "torrada", "macarrão", "aveia", "granola", "biscoito"]):
                    continue
                if "lactose_free" in restrictions and any(m in desc_lower for m in ["leite", "queijo", "iogurte", "requeijão"]):
                    continue
                
                # Filter by disliked foods
                title_lower = f.get("title", "").lower()
                if any(d in title_lower or d in desc_lower for d in disliked):
                    continue
                
                candidates.append(f)
            
            if not candidates:
                candidates = foods
            
            # Score by AI insights
            if priority_benefits:
                candidates = sorted(candidates, key=lambda x: score_food_for_insights(x, priority_benefits), reverse=True)
            
            # Boost favorites
            if favorites:
                def has_favorite(f):
                    return any(fv in f.get("title", "").lower() or fv in f.get("desc", "").lower() for fv in favorites)
                candidates = sorted(candidates, key=has_favorite, reverse=True)
            
            # Pick food - rotate for variety
            top_n = min(len(candidates), max(3, len(candidates)))
            picked = candidates[day % top_n] if candidates else {"title": "Refeição livre", "desc": "", "kcal": 300, "p": 15, "c": 35, "f": 10, "subs": [], "benefits": []}
            
            target_kcal = round(kcal_target * MEAL_KCAL_SPLIT.get(meal_type, 0.15))
            ratio = target_kcal / (picked.get("kcal") or 300)
            
            description = f"{picked.get('desc', '')}\n\n🔄 Substituições:\n• " + "\n• ".join(picked.get("subs", []))
            if insights:
                description += generate_insight_note(picked, insights)
            
            items.append({
                "meal_type": meal_type,
                "day_of_week": day,
                "title": picked.get("title", "Refeição"),
                "description": description,
                "calories_target": target_kcal,
                "protein_target": round(picked.get("p", 15) * ratio),
                "carbs_target": round(picked.get("c", 30) * ratio),
                "fat_target": round(picked.get("f", 10) * ratio),
            })
    
    return items


def generate_tips(answers: dict) -> List[dict]:
    """Generate nutrition tips based on anamnesis answers."""
    tips = []
    
    water_intake = answers.get("water_intake")
    if water_intake and water_intake < 8:
        tips.append({
            "tip": "Você bebe menos de 2L de água por dia. Tente aumentar gradualmente — coloque lembretes no celular!",
            "category": "hydration",
            "icon": "💧"
        })
    
    sleep_time = answers.get("sleep_time")
    wake_time = answers.get("wake_time")
    if sleep_time and wake_time:
        try:
            sleep_hour = int(sleep_time.split(":")[0])
            wake_hour = int(wake_time.split(":")[0])
            hours = (24 - sleep_hour + wake_hour) if sleep_hour > wake_hour else (wake_hour - sleep_hour)
            if hours < 7:
                tips.append({
                    "tip": "Você está dormindo menos de 7h. Dormir bem é essencial para controlar a fome e manter o metabolismo ativo.",
                    "category": "sleep",
                    "icon": "😴"
                })
        except (ValueError, IndexError):
            pass
    
    activity_level = answers.get("activity_level")
    if activity_level == "sedentary":
        tips.append({
            "tip": "Comece com caminhadas de 20min, 3x por semana. Pequenos passos fazem grande diferença!",
            "category": "exercise",
            "icon": "🚶"
        })
    
    goal = answers.get("goal")
    if goal == "lose_weight":
        tips.append({
            "tip": "Foque em comer devagar e mastigar bem. Isso ajuda na saciedade e na digestão.",
            "category": "nutrition",
            "icon": "🍽️"
        })
    elif goal == "gain_muscle":
        tips.append({
            "tip": "Distribua a proteína ao longo do dia, não concentre tudo em uma refeição.",
            "category": "nutrition",
            "icon": "💪"
        })
    
    return tips


@router.post("/generate-meal-plan", response_model=GenerateMealPlanResponse)
async def generate_meal_plan(
    payload: GenerateMealPlanRequest,
    user: AuthenticatedUser = Depends(require_role(["nutritionist", "admin"])),
):
    """Generate AI-powered meal plan for a patient."""
    db = get_supabase()
    
    # Fetch anamnesis
    anamnesis_res = db.table("patient_anamnesis").select("*").eq("user_id", payload.patient_id).eq("status", "completed").order("created_at", desc=True).limit(1).execute()
    
    if not anamnesis_res.data:
        raise HTTPException(404, "Anamnese não encontrada para este paciente")
    
    anamnesis = anamnesis_res.data[0]
    
    # Fetch AI insights
    insights_res = db.table("anamnesis_ai_insights").select("*").eq("user_id", payload.patient_id).order("created_at", desc=True).limit(1).execute()
    ai_insights = insights_res.data[0] if insights_res.data else None
    
    # Fetch latest physical assessment (priority over anamnesis)
    assessment_res = db.table("physical_assessments").select("calories_target, protein_target, carbs_target, fat_target, tdee, bmr, weight, body_fat_percentage").eq("patient_id", payload.patient_id).order("assessment_date", desc=True).limit(1).execute()
    physical_assessment = assessment_res.data[0] if assessment_res.data else None
    
    # Determine targets
    kcal = physical_assessment.get("calories_target") if physical_assessment else None
    kcal = kcal or anamnesis.get("computed_kcal_target") or 2000
    
    protein = physical_assessment.get("protein_target") if physical_assessment else None
    protein = protein or anamnesis.get("computed_protein") or 100
    
    carbs = physical_assessment.get("carbs_target") if physical_assessment else None
    carbs = carbs or anamnesis.get("computed_carbs") or 250
    
    fat = physical_assessment.get("fat_target") if physical_assessment else None
    fat = fat or anamnesis.get("computed_fat") or 60
    
    answers = anamnesis.get("answers") or {}
    data_source = "physical_assessment" if physical_assessment and physical_assessment.get("calories_target") else "anamnesis"
    
    # Generate meal plan items
    plan_items = generate_plan(answers, int(kcal), int(protein), int(carbs), int(fat), ai_insights)
    
    # Delete existing items for this plan
    db.table("meal_plan_items").delete().eq("meal_plan_id", payload.meal_plan_id).execute()
    
    # Insert new items
    items_to_insert = [{"meal_plan_id": payload.meal_plan_id, **item} for item in plan_items]
    insert_res = db.table("meal_plan_items").insert(items_to_insert).execute()
    
    if not insert_res.data:
        raise HTTPException(500, "Erro ao inserir itens do plano")
    
    # Generate and insert tips
    tips = generate_tips(answers)
    db.table("patient_tips").delete().eq("user_id", payload.patient_id).execute()
    if tips:
        tips_to_insert = [{"user_id": payload.patient_id, **tip} for tip in tips]
        db.table("patient_tips").insert(tips_to_insert).execute()
    
    # Add timeline event for AI-powered plan
    if ai_insights:
        db.table("patient_timeline").insert({
            "patient_id": payload.patient_id,
            "event_type": "meal_plan",
            "title": "Plano Alimentar Inteligente Gerado",
            "description": f"Plano personalizado com base nos insights da IA: {ai_insights.get('primary_goal', 'objetivo definido')}. Nível de atenção: {ai_insights.get('risk_level', 'baixo')}.",
            "metadata": {
                "type": "ai_plan_generated",
                "meal_plan_id": payload.meal_plan_id,
                "insight_id": ai_insights.get("id"),
                "items_count": len(plan_items),
            },
            "created_by": user.user_id,
        }).execute()
    
    return GenerateMealPlanResponse(
        success=True,
        items_count=len(plan_items),
        tips_count=len(tips),
        macros={"kcal": int(kcal), "protein": int(protein), "carbs": int(carbs), "fat": int(fat)},
        data_source=data_source,
        ai_personalized=bool(ai_insights),
        insight_used={
            "risk_level": ai_insights.get("risk_level"),
            "primary_goal": ai_insights.get("primary_goal"),
            "nutrition_focus": ai_insights.get("nutrition_focus"),
        } if ai_insights else None,
    )

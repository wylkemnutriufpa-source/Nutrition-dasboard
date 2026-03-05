from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import base64
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# ==================== MEAL ANALYSIS ENDPOINT ====================

class MealAnalysisRequest(BaseModel):
    image_base64: str  # Base64 encoded image (JPEG/PNG/WEBP)
    patient_id: str
    mime_type: str = "image/jpeg"

class MealAnalysisResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


MEAL_ANALYSIS_PROMPT = """Você é um nutricionista especialista em análise visual de refeições brasileiras.

Analise esta foto de refeição e retorne APENAS um JSON válido (sem markdown, sem ```json, sem texto extra) seguindo EXATAMENTE este schema:

{
  "foods": [
    { "name": "nome do alimento em português", "confidence": 0.0-1.0, "portion": "porção estimada", "notes": "observação se necessário" }
  ],
  "macros_estimate": {
    "calories": número inteiro,
    "protein_g": número,
    "carbs_g": número,
    "fat_g": número,
    "fiber_g": número
  },
  "quality_score": 0-100,
  "adherence_score": 0-100,
  "flags": {
    "high_sugar": boolean,
    "ultra_processed": boolean,
    "low_veggies": boolean,
    "high_fat": boolean,
    "low_protein": boolean,
    "good_balance": boolean
  },
  "feedback_ptbr": "feedback curto, gentil e acionável em português (2-3 linhas)",
  "suggestions_ptbr": ["sugestão 1", "sugestão 2", "sugestão 3"]
}

REGRAS:
- Se a imagem NÃO for uma refeição/comida, retorne quality_score=0 e feedback explicando.
- Não invente alimentos. Se incerto, reduza confidence e explique em notes.
- Porções são estimativas visuais - deixe claro.
- quality_score: 0=péssimo, 50=regular, 80+=excelente (equilíbrio nutricional)
- adherence_score: assume dieta equilibrada padrão se não tiver contexto
- Feedback SEMPRE gentil, motivacional e acionável.
- Sugestões práticas e simples.
- RETORNE APENAS O JSON, sem nenhum texto adicional."""


@api_router.post("/analyze-meal", response_model=MealAnalysisResponse)
async def analyze_meal(request: MealAnalysisRequest):
    """Analisa foto de refeição usando GPT-4o Vision"""
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            return MealAnalysisResponse(success=False, error="Chave de IA não configurada")

        # Import emergent integrations
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

        # Create chat instance
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"meal-analysis-{request.patient_id}-{uuid.uuid4().hex[:8]}",
            system_message="Você é um nutricionista especialista em análise visual de refeições."
        )
        chat.with_model("openai", "gpt-4o")

        # Create image content
        image_content = ImageContent(
            image_base64=request.image_base64
        )

        # Send message with image
        user_message = UserMessage(
            text=MEAL_ANALYSIS_PROMPT,
            file_contents=[image_content]
        )

        response_text = await chat.send_message(user_message)
        
        logger.info(f"🍽️ AI Response received for patient {request.patient_id}")

        # Parse JSON from response
        # Clean potential markdown wrapping
        cleaned = response_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        analysis_data = json.loads(cleaned)
        
        logger.info(f"✅ Meal analysis parsed successfully: quality={analysis_data.get('quality_score')}")

        return MealAnalysisResponse(
            success=True,
            data=analysis_data
        )

    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON parse error: {e}")
        return MealAnalysisResponse(
            success=False,
            error=f"Erro ao processar resposta da IA: {str(e)}"
        )
    except Exception as e:
        logger.error(f"❌ Meal analysis error: {e}")
        return MealAnalysisResponse(
            success=False,
            error=f"Erro na análise: {str(e)}"
        )


# ==================== BODY COMPOSITION ANALYSIS ENDPOINT ====================

class BodyAnalysisRequest(BaseModel):
    images: dict  # { "front": base64, "side": base64, "back": base64 }
    patient_id: str
    previous_analysis: Optional[dict] = None  # Análise anterior para comparação
    analysis_type: str = "progress"  # baseline, progress, feedback

class BodyAnalysisResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


BODY_ANALYSIS_PROMPT = """Você é um especialista em avaliação física e composição corporal.

Analise as fotos corporais fornecidas (frente, lado e/ou costas) e retorne APENAS um JSON válido (sem markdown, sem ```json, sem texto extra) seguindo EXATAMENTE este schema:

{
  "body_fat_estimate": número de 5 a 45 (% estimado de gordura corporal),
  "muscle_definition": número de 1 a 10 (1=sem definição, 10=muito definido),
  "body_type": "ectomorfo" | "mesomorfo" | "endomorfo" | "ecto-mesomorfo" | "meso-endomorfo",
  "fat_distribution": {
    "abdominal": "low" | "moderate" | "high",
    "chest": "low" | "moderate" | "high",
    "arms": "low" | "moderate" | "high",
    "legs": "low" | "moderate" | "high",
    "back": "low" | "moderate" | "high"
  },
  "region_analysis": {
    "shoulders": { "score": 1-10, "notes": "observação breve" },
    "chest": { "score": 1-10, "notes": "observação breve" },
    "abdomen": { "score": 1-10, "notes": "observação breve" },
    "arms": { "score": 1-10, "notes": "observação breve" },
    "legs": { "score": 1-10, "notes": "observação breve" },
    "back": { "score": 1-10, "notes": "observação breve" }
  },
  "posture_score": 1-10,
  "posture_notes": "observações sobre postura",
  "overall_score": 0-100 (score geral de composição corporal, onde 100=excelente forma física),
  "ai_feedback": "feedback humanizado em português (3-4 linhas), gentil e motivacional",
  "recommendations": ["recomendação 1", "recomendação 2", "recomendação 3"]
}

REGRAS IMPORTANTES:
- Seja CONSERVADOR nas estimativas de % de gordura - é uma estimativa visual apenas.
- body_fat_estimate: homens atléticos 8-15%, medianos 15-25%, sobrepeso 25-35%. Mulheres: atlética 15-22%, mediana 22-32%, sobrepeso 32-42%.
- muscle_definition: 1-3=pouca, 4-6=moderada, 7-8=boa, 9-10=excelente definição.
- Se não conseguir ver alguma região claramente, dê score médio (5) e indique nas notes.
- Feedback SEMPRE gentil, motivacional e respeitoso.
- NÃO faça julgamentos negativos sobre o corpo.
- RETORNE APENAS O JSON, sem nenhum texto adicional."""


BODY_COMPARISON_PROMPT = """Você é um especialista em avaliação física e composição corporal.

Compare as fotos corporais ATUAIS com a análise ANTERIOR e identifique mudanças visíveis.

ANÁLISE ANTERIOR:
{previous_analysis}

Analise as fotos ATUAIS e retorne APENAS um JSON válido seguindo este schema:

{
  "body_fat_estimate": número (% atual estimado),
  "muscle_definition": 1-10 (atual),
  "body_type": "tipo atual",
  "fat_distribution": { ... },
  "region_analysis": { ... },
  "posture_score": 1-10,
  "posture_notes": "...",
  "overall_score": 0-100,
  "ai_feedback": "feedback sobre estado atual",
  "recommendations": ["...", "...", "..."],
  
  "comparison": {
    "body_fat_change": número (variação em pontos percentuais, negativo=perdeu gordura),
    "muscle_definition_change": número (variação, positivo=ganhou definição),
    "overall_progress": "positive" | "stable" | "negative",
    "progress_score": 0-100 (quanto progrediu),
    "highlights": [
      "Mudança positiva 1 (se houver)",
      "Mudança positiva 2 (se houver)"
    ],
    "areas_improved": ["região1", "região2"],
    "areas_attention": ["região que precisa atenção"],
    "time_feedback": "feedback considerando o tempo entre análises"
  }
}

REGRAS:
- Compare objetivamente as fotos.
- Destaque QUALQUER progresso, mesmo pequeno.
- Se não houver mudanças visíveis, diga que está estável (não é negativo!).
- Seja MUITO motivacional no feedback.
- RETORNE APENAS O JSON."""


@api_router.post("/analyze-body", response_model=BodyAnalysisResponse)
async def analyze_body(request: BodyAnalysisRequest):
    """Analisa fotos corporais usando GPT-4o Vision"""
    try:
        logger.info(f"💪 Starting body analysis for patient {request.patient_id}")
        logger.info(f"📸 Images received: front={bool(request.images.get('front'))}, side={bool(request.images.get('side'))}, back={bool(request.images.get('back'))}")
        
        llm_key = os.environ.get('EMERGENT_LLM_KEY')
        if not llm_key:
            return BodyAnalysisResponse(success=False, error="Chave de IA não configurada")

        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

        # Criar chat
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"body-analysis-{request.patient_id}-{uuid.uuid4().hex[:8]}",
            system_message="Você é um especialista em avaliação física e composição corporal."
        )
        chat.with_model("openai", "gpt-4o")

        # Preparar imagens
        image_contents = []
        for position in ['front', 'side', 'back']:
            img_data = request.images.get(position)
            if img_data:
                # Log tamanho da imagem
                logger.info(f"📸 {position} image size: {len(img_data)} chars")
                image_contents.append(ImageContent(image_base64=img_data))

        if not image_contents:
            return BodyAnalysisResponse(success=False, error="Nenhuma imagem fornecida")

        logger.info(f"📸 Total images to analyze: {len(image_contents)}")

        # Escolher prompt (com ou sem comparação)
        if request.previous_analysis:
            prompt = BODY_COMPARISON_PROMPT.format(
                previous_analysis=json.dumps(request.previous_analysis, ensure_ascii=False, indent=2)
            )
        else:
            prompt = BODY_ANALYSIS_PROMPT

        # Enviar mensagem com imagens
        user_message = UserMessage(
            text=prompt,
            file_contents=image_contents
        )

        logger.info(f"🚀 Sending to GPT-4o Vision...")
        response_text = await chat.send_message(user_message)
        
        logger.info(f"💪 Body analysis response received for patient {request.patient_id}")

        # Parse JSON
        cleaned = response_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        analysis_data = json.loads(cleaned)
        
        logger.info(f"✅ Body analysis parsed: bf={analysis_data.get('body_fat_estimate')}%, score={analysis_data.get('overall_score')}")

        return BodyAnalysisResponse(
            success=True,
            data=analysis_data
        )

    except json.JSONDecodeError as e:
        logger.error(f"❌ Body analysis JSON parse error: {e}")
        return BodyAnalysisResponse(
            success=False,
            error=f"Erro ao processar resposta da IA: {str(e)}"
        )
    except Exception as e:
        logger.error(f"❌ Body analysis error: {e}")
        return BodyAnalysisResponse(
            success=False,
            error=f"Erro na análise: {str(e)}"
        )

# ==================== RECIPE GENERATOR ====================
from routes.recipes import router as recipes_router
api_router.include_router(recipes_router, prefix="/recipes", tags=["recipes"])

# Include the router in the main app (AFTER all routes are defined)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
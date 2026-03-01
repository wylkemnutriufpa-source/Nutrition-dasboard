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

# Include the router in the main app
app.include_router(api_router)


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
"""
API Endpoint: /api/recipes/generate
Gera receitas usando IA
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import sys
import os

# Adicionar path do backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.recipe_generator import generate_recipe

router = APIRouter()

class RecipeGenerateRequest(BaseModel):
    ingredients: List[str]
    patient_profile: Dict
    dietary_restrictions: Optional[List[str]] = None
    mode: Optional[str] = "strict"  # "strict" ou "flexible"

class RecipeGenerateResponse(BaseModel):
    success: bool
    recipe: Optional[Dict] = None
    error: Optional[str] = None
    raw_response: Optional[str] = None

@router.post("/generate", response_model=RecipeGenerateResponse)
async def generate_recipe_endpoint(request: RecipeGenerateRequest):
    """
    Gera receita usando OpenAI GPT-4o-mini
    
    Requer:
    - ingredients: Lista de ingredientes disponíveis
    - patient_profile: Perfil nutricional (goal, daily_calories, etc)
    - dietary_restrictions: (opcional) Lista de restrições
    - mode: (opcional) "strict" ou "flexible" (default: "strict")
    
    Retorna:
    - success: bool
    - recipe: Dict com receita completa (se sucesso)
    - error: mensagem de erro (se falha)
    """
    try:
        if not request.ingredients:
            raise HTTPException(status_code=400, detail="Lista de ingredientes vazia")
        
        # Validar limite de ingredientes
        if len(request.ingredients) > 15:
            raise HTTPException(status_code=400, detail="Máximo de 15 ingredientes permitidos")
        
        # Validar modo
        if request.mode not in ["strict", "flexible"]:
            raise HTTPException(status_code=400, detail="Modo deve ser 'strict' ou 'flexible'")
        
        result = await generate_recipe(
            ingredients=request.ingredients,
            patient_profile=request.patient_profile,
            dietary_restrictions=request.dietary_restrictions,
            mode=request.mode
        )
        
        return RecipeGenerateResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar receita: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check do serviço de receitas"""
    return {"status": "ok", "service": "recipe_generator"}

"""
Supabase Edge Function: generate-recipe
Gera receitas usando OpenAI GPT-4o-mini baseado em ingredientes e perfil do paciente
"""
import os
import json
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Carregar variáveis de ambiente
load_dotenv()

async def generate_recipe(ingredients, patient_profile, dietary_restrictions=None, mode="strict"):
    """
    Gera receita personalizada usando OpenAI
    
    Args:
        ingredients: Lista de ingredientes disponíveis
        patient_profile: Perfil nutricional do paciente (objetivo, restrições)
        dietary_restrictions: Restrições alimentares
        mode: "strict" (somente ingredientes fornecidos) ou "flexible" (permite sugestões)
    
    Returns:
        dict com receita gerada
    """
    
    # Obter chave
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise ValueError('EMERGENT_LLM_KEY não configurada')
    
    # Montar contexto do paciente
    patient_context = f"""
Perfil do Paciente:
- Objetivo: {patient_profile.get('goal', 'Não especificado')}
- Meta de calorias: {patient_profile.get('daily_calories', 2000)} kcal/dia
- Proteína: {patient_profile.get('daily_protein', 100)}g
- Carboidratos: {patient_profile.get('daily_carbs', 250)}g
- Gorduras: {patient_profile.get('daily_fat', 70)}g
"""
    
    if dietary_restrictions:
        patient_context += f"\n- Restrições: {', '.join(dietary_restrictions)}"
    
    # System message baseado no modo
    if mode == "strict":
        system_msg = """Você é um nutricionista especializado em criar receitas saudáveis e equilibradas.
MODO ESTRITO: Você deve criar receitas usando SOMENTE os ingredientes fornecidos.

Regras:
1. Use APENAS os ingredientes da lista fornecida
2. Pode usar ingredientes básicos da despensa: sal, água, pimenta do reino, temperos secos comuns (alho em pó, cebola em pó, orégano, etc)
3. NÃO adicione ingredientes extras que o usuário não tem
4. A receita deve ser prática e fácil de fazer
5. Respeite as restrições alimentares do paciente
6. Se adeque aos objetivos nutricionais

Formato da resposta (JSON):
{
  "nome": "Nome da receita",
  "tempo_preparo": "X minutos",
  "porcoes": X,
  "calorias_por_porcao": X,
  "macros": {
    "proteina": X,
    "carboidrato": X,
    "gordura": X
  },
  "ingredientes": [
    {"item": "Nome", "quantidade": "X gramas/unidades"}
  ],
  "modo_preparo": [
    "Passo 1",
    "Passo 2"
  ],
  "dicas": "Dica opcional",
  "generation_mode": "strict",
  "suggestions": []
}
"""
    else:  # flexible
        system_msg = """Você é um nutricionista especializado em criar receitas saudáveis e equilibradas.
MODO FLEXÍVEL: Você deve criar uma receita base com os ingredientes fornecidos, mas pode sugerir até 3 melhorias opcionais.

Regras:
1. A receita BASE deve usar principalmente os ingredientes fornecidos
2. Ingredientes básicos (sal, água, temperos) são sempre permitidos
3. Você pode sugerir ATÉ 3 ingredientes extras para melhorar a receita
4. As sugestões devem ter justificativa clara (ex: "aumenta proteína", "melhora textura")
5. As sugestões são OPCIONAIS e não alteram a receita base
6. Respeite as restrições alimentares do paciente
7. Se adeque aos objetivos nutricionais

Formato da resposta (JSON):
{
  "nome": "Nome da receita",
  "tempo_preparo": "X minutos",
  "porcoes": X,
  "calorias_por_porcao": X,
  "macros": {
    "proteina": X,
    "carboidrato": X,
    "gordura": X
  },
  "ingredientes": [
    {"item": "Nome", "quantidade": "X gramas/unidades"}
  ],
  "modo_preparo": [
    "Passo 1",
    "Passo 2"
  ],
  "dicas": "Dica opcional",
  "generation_mode": "flexible",
  "suggestions": [
    {
      "item": "1 ovo",
      "reason": "aumenta proteína e melhora textura",
      "optional": true
    }
  ]
}

IMPORTANTE: suggestions deve conter no máximo 3 itens. Se não houver sugestões relevantes, retorne array vazio.
"""
    
    # Montar prompt
    ingredients_text = ", ".join(ingredients)
    mode_instruction = "ESTRITO - use SOMENTE estes ingredientes" if mode == "strict" else "FLEXÍVEL - pode sugerir melhorias opcionais"
    
    user_prompt = f"""
{patient_context}

Ingredientes disponíveis: {ingredients_text}

MODO: {mode_instruction}

Crie uma receita saudável e equilibrada.
Retorne APENAS o JSON, sem texto adicional.
"""
    
    # Chamar OpenAI
    chat = LlmChat(
        api_key=api_key,
        session_id=f"recipe_{patient_profile.get('id', 'unknown')}",
        system_message=system_msg
    ).with_model("openai", "gpt-4o-mini")
    
    message = UserMessage(text=user_prompt)
    response = await chat.send_message(message)
    
    # Parse JSON response
    try:
        # Limpar resposta (remover markdown se tiver)
        cleaned = response.strip()
        if cleaned.startswith('```json'):
            cleaned = cleaned[7:]
        if cleaned.startswith('```'):
            cleaned = cleaned[3:]
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        recipe = json.loads(cleaned)
        return {
            'success': True,
            'recipe': recipe
        }
    except json.JSONDecodeError:
        return {
            'success': False,
            'error': 'Erro ao processar resposta da IA',
            'raw_response': response
        }

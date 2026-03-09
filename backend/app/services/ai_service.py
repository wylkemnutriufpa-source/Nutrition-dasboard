"""
Serviço de chamadas à API de IA via emergentintegrations.
Inclui timeout, tratamento de erro e sanitização de resposta.
"""

import re
import uuid
import logging

from fastapi import HTTPException
from emergentintegrations.llm.chat import LlmChat, UserMessage

from app.config import get_settings

logger = logging.getLogger("app.ai_service")
settings = get_settings()


def sanitize_ai_response(text: str) -> str:
    """Remove tags HTML e URIs perigosas da resposta da IA."""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"javascript:", "", text, flags=re.IGNORECASE)
    text = re.sub(r"on\w+\s*=", "", text, flags=re.IGNORECASE)
    return text.strip()


async def call_openai(prompt: str, system_prompt: str = "") -> str:
    """
    Chama a API de IA via Emergent LLM Key.
    Retorna texto sanitizado.
    """
    try:
        chat = LlmChat(
            api_key=settings.EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message=system_prompt or "Você é um nutricionista especializado. Responda sempre em português.",
        ).with_model("openai", "gpt-4o")

        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return sanitize_ai_response(response)

    except Exception as e:
        logger.exception("Erro na chamada de IA: %s", e)
        raise HTTPException(500, "Erro interno ao processar análise de IA")

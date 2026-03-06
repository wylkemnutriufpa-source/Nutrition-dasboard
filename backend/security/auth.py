"""
Supabase JWT Authentication Module

Valida tokens JWT do Supabase e extrai informações do usuário autenticado.
Substitui o header customizado X-User-Id por autenticação real baseada em JWT.
"""

from fastapi import Header, HTTPException, status
from typing import Optional, Dict, Any
import os
import logging
import jwt
from jwt import PyJWTError

logger = logging.getLogger(__name__)


def get_jwt_secret() -> str:
    """Load JWT secret from environment with lazy loading"""
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        logger.warning("⚠️ SUPABASE_JWT_SECRET not configured - JWT validation will fail")
    return secret


class CurrentUser:
    """Representa o usuário autenticado extraído do JWT"""
    def __init__(self, user_id: str, email: Optional[str] = None, role: Optional[str] = None, token_payload: Dict[str, Any] = None):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.token_payload = token_payload or {}
    
    def __repr__(self):
        return f"CurrentUser(user_id={self.user_id}, email={self.email}, role={self.role})"


async def get_current_user(authorization: Optional[str] = Header(None)) -> CurrentUser:
    """
    FastAPI Dependency: Extrai e valida o usuário autenticado do JWT Supabase.
    
    Args:
        authorization: Header "Authorization: Bearer <token>"
    
    Returns:
        CurrentUser com user_id, email e payload do token
    
    Raises:
        HTTPException 401: Se token ausente, inválido ou expirado
    """
    
    # Verificar se Authorization header está presente
    if not authorization:
        logger.warning("🚫 Missing Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extrair token do header "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        logger.warning("🚫 Invalid Authorization header format")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header. Expected format: 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = parts[1]
    
    # Validar JWT
    SUPABASE_JWT_SECRET = get_jwt_secret()
    if not SUPABASE_JWT_SECRET:
        logger.error("❌ Cannot validate JWT - SUPABASE_JWT_SECRET not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server authentication configuration error"
        )
    
    try:
        # Decodificar e validar JWT
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": False  # Supabase não usa 'aud' standard
            }
        )
        
        # Extrair informações do usuário
        user_id = payload.get("sub")
        if not user_id:
            logger.error("❌ JWT missing 'sub' claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user identifier"
            )
        
        email = payload.get("email")
        role = payload.get("role")  # Supabase inclui role no JWT
        
        logger.info(f"✅ Authenticated user: {user_id} ({email})")
        
        return CurrentUser(
            user_id=user_id,
            email=email,
            role=role,
            token_payload=payload
        )
        
    except jwt.ExpiredSignatureError:
        logger.warning("🚫 JWT token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    except PyJWTError as e:
        logger.warning(f"🚫 JWT validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or malformed token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    except Exception as e:
        logger.error(f"❌ Unexpected error during JWT validation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication error"
        )


async def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[CurrentUser]:
    """
    Versão opcional do get_current_user que retorna None ao invés de 401.
    Útil para endpoints que funcionam com ou sem autenticação.
    
    Returns:
        CurrentUser se autenticado, None caso contrário
    """
    if not authorization:
        return None
    
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None

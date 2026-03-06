"""
Supabase JWT Authentication Module

Valida tokens JWT do Supabase e extrai informações do usuário autenticado.
Substitui o header customizado X-User-Id por autenticação real baseada em JWT.

IMPORTANTE – Fonte do role:
  - O JWT do Supabase contém um campo "role" que representa o role interno do
    Supabase (ex: "authenticated"), NÃO o role da aplicação.
  - O role real da aplicação (admin/professional/patient) está em public.profiles.role.
  - Use `get_current_user_with_db_role()` quando precisar do role da aplicação.
  - Use `get_current_user()` apenas para autenticação (verificar identidade/user_id).
"""

from fastapi import Header, HTTPException, status
from typing import Optional, Dict, Any
import os
import logging
import httpx
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
    """
    Representa o usuário autenticado extraído do JWT.

    Campos:
        user_id      – sub do JWT (UUID do auth.users)
        email        – email do usuário
        jwt_role     – role interno do Supabase ("authenticated", "service_role" …)
                       NÃO usar para autorização da aplicação
        app_role     – role real da aplicação, lido de public.profiles
                       Preenchido por get_current_user_with_db_role(); None caso contrário
        token_payload – payload completo do JWT
    """
    def __init__(
        self,
        user_id: str,
        email: Optional[str] = None,
        jwt_role: Optional[str] = None,
        app_role: Optional[str] = None,
        token_payload: Dict[str, Any] = None,
    ):
        self.user_id = user_id
        self.email = email
        self.jwt_role = jwt_role
        # Manter .role como alias de app_role para não quebrar código legado,
        # mas deixar explícito que não deve ser usado para autorização da app
        self.role = app_role  # ⚠️  use app_role — jwt_role é interno do Supabase
        self.app_role = app_role
        self.token_payload = token_payload or {}

    def __repr__(self):
        return (
            f"CurrentUser(user_id={self.user_id}, email={self.email}, "
            f"app_role={self.app_role}, jwt_role={self.jwt_role})"
        )


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
        jwt_role = payload.get("role")  # role interno do Supabase, NÃO o role da app

        logger.info(f"✅ Authenticated user: {user_id} ({email})")

        return CurrentUser(
            user_id=user_id,
            email=email,
            jwt_role=jwt_role,
            app_role=None,  # será preenchido por get_current_user_with_db_role se necessário
            token_payload=payload,
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


async def get_current_user_with_db_role(
    authorization: Optional[str] = Header(None),
) -> CurrentUser:
    """
    FastAPI Dependency: igual a get_current_user, mas enriquece o CurrentUser
    com o role real da aplicação lido de public.profiles.role.

    Use este dependency em endpoints que precisam verificar admin/professional/patient.
    Nunca confie em jwt_role para autorização da aplicação.

    Raises:
        HTTPException 401: JWT inválido/ausente
        HTTPException 403: Perfil não encontrado no DB
    """
    user = await get_current_user(authorization)

    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        logger.error("❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error",
        )

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{supabase_url}/rest/v1/profiles",
                headers={
                    "Authorization": f"Bearer {service_role_key}",
                    "apikey": service_role_key,
                },
                params={"id": f"eq.{user.user_id}", "select": "role"},
            )

        if resp.status_code != 200:
            logger.warning(f"⚠️ Falha ao buscar profile no DB: {resp.status_code}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Perfil não encontrado",
            )

        rows = resp.json()
        if not rows:
            logger.warning(f"⚠️ Profile não encontrado para user_id={user.user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Perfil de usuário não encontrado",
            )

        db_role = rows[0].get("role")
        user.app_role = db_role
        user.role = db_role  # manter alias

        logger.info(f"✅ Role carregado do DB: {user.user_id} → {db_role}")
        return user

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"❌ Erro ao buscar role do DB: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao verificar permissões",
        )


def require_role(required_role: str):
    """
    Decorator/factory de dependency que exige um role específico da aplicação.
    
    Exemplo de uso:
        @router.post("/admin-only")
        async def admin_endpoint(user = Depends(require_role("admin"))):
            ...

    IMPORTANTE: requer que o endpoint use get_current_user_with_db_role
    (ou equivalente) anteriormente para popular app_role.
    """
    async def _check_role(authorization: Optional[str] = Header(None)) -> CurrentUser:
        user = await get_current_user_with_db_role(authorization)
        if user.app_role != required_role and user.app_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Requer role: {required_role}",
            )
        return user
    return _check_role

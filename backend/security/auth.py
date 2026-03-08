"""
Supabase JWT Authentication Module

Valida tokens JWT do Supabase e extrai informações do usuário autenticado.

Suporte a dois algoritmos:
  - HS256: projetos antigos → valida com SUPABASE_JWT_SECRET
  - ES256: projetos novos  → valida com chave pública via JWKS

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
from jwt.algorithms import ECAlgorithm

logger = logging.getLogger(__name__)

# Cache simples das chaves JWKS (evita fetch a cada request)
_jwks_cache: Dict[str, Any] = {}


def get_jwt_secret() -> str:
    """Load JWT secret from environment with lazy loading"""
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        logger.warning("⚠️ SUPABASE_JWT_SECRET not configured")
    return secret


async def _get_jwks_public_key(supabase_url: str, kid: Optional[str] = None) -> Optional[Any]:
    """
    Busca a chave pública ECDSA do Supabase via JWKS para validar tokens ES256.
    Usa cache em memória para evitar chamadas repetidas.
    """
    global _jwks_cache

    jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    # Usar cache se disponível
    if jwks_url in _jwks_cache:
        keys = _jwks_cache[jwks_url]
    else:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(jwks_url)
            if resp.status_code != 200:
                logger.error("JWKS fetch failed: %s", resp.status_code)
                return None
            keys = resp.json().get("keys", [])
            _jwks_cache[jwks_url] = keys
            logger.info("✅ JWKS carregado: %d chave(s)", len(keys))
        except Exception as exc:
            logger.error("JWKS fetch exception: %s", exc)
            return None

    # Selecionar chave pelo kid (se fornecido) ou pegar a primeira disponível
    for key_data in keys:
        if kid is None or key_data.get("kid") == kid:
            try:
                return ECAlgorithm.from_jwk(key_data)
            except Exception as exc:
                logger.error("Erro ao carregar chave ECDSA: %s", exc)
    return None


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

    Suporte automático a dois algoritmos:
      - HS256: usa SUPABASE_JWT_SECRET
      - ES256: busca chave pública via JWKS (projetos novos do Supabase)

    Raises:
        HTTPException 401: token ausente, inválido ou expirado
    """
    if not authorization:
        logger.warning("🚫 Missing Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        logger.warning("🚫 Invalid Authorization header format")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header. Expected format: 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]

    # ── Detectar algoritmo do JWT header (sem verificar assinatura) ──────────
    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
        )

    alg = unverified_header.get("alg", "HS256")
    kid = unverified_header.get("kid")

    payload: Optional[Dict[str, Any]] = None

    # ── ES256: validar com chave pública JWKS ────────────────────────────────
    if alg == "ES256":
        supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
        if not supabase_url:
            logger.error("❌ SUPABASE_URL não configurado — não é possível validar ES256")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server authentication configuration error",
            )

        public_key = await _get_jwks_public_key(supabase_url, kid)
        if not public_key:
            logger.error("❌ Chave pública ES256 não encontrada no JWKS")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to verify token signature",
            )

        try:
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["ES256"],
                options={"verify_aud": False},
            )
            logger.info("✅ JWT ES256 validado via JWKS (kid=%s)", kid)
        except jwt.ExpiredSignatureError:
            logger.warning("🚫 JWT ES256 expirado")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
            )
        except PyJWTError as exc:
            logger.warning("❌ JWT ES256 inválido – detalhe: %s | type: %s", exc, type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        except Exception as exc:
            logger.error("❌ Erro inesperado no decode ES256: %s | type: %s", exc, type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token validation error",
            )

    # ── HS256: validar com SUPABASE_JWT_SECRET ───────────────────────────────
    else:
        jwt_secret = get_jwt_secret()
        if not jwt_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server authentication configuration error",
            )

        try:
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            logger.debug("✅ JWT HS256 validado")
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
            )
        except PyJWTError as exc:
            logger.warning("❌ JWT HS256 inválido: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

    # ── Extrair informações do usuário ───────────────────────────────────────
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier",
        )

    email = payload.get("email")
    jwt_role = payload.get("role")

    logger.info("✅ Authenticated user: %s (%s) alg=%s", user_id, email, alg)

    return CurrentUser(
        user_id=user_id,
        email=email,
        jwt_role=jwt_role,
        app_role=None,
        token_payload=payload,
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
        async with httpx.AsyncClient(timeout=5.0) as client:
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

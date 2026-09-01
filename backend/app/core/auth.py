"""
JWT Authentication & Multi-Tenant Authorization Layer for KSEC Gateway.
Provides secure token issuance, validation, and user/tenant resolution.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "ksec_saas_jwt_super_secret_signing_key_v2")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates signed JWT access token with expiration claims."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decodes and validates signed JWT payload across supported keys."""
    # 1. Try auth_service if available
    try:
        from src.auth.auth_service import auth_service
        return auth_service.decode_token(token)
    except Exception:
        pass

    # 2. Try default secret key
    for secret in [SECRET_KEY, "ksec-super-secret-key-change-in-production-2026", "ksec_saas_jwt_super_secret_signing_key_v2"]:
        try:
            return jwt.decode(token, secret, algorithms=[ALGORITHM])
        except Exception:
            continue

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    auth_header_token: Optional[str] = Depends(oauth2_scheme),
    query_token: Optional[str] = Query(None, alias="token"),
) -> str:
    """
    Resolves current user identity from either Authorization Bearer header
    or query parameter (supporting native browser EventSource SSE connections).
    """
    token = auth_header_token or query_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    username: Optional[str] = payload.get("sub") or payload.get("email") or payload.get("tenant_id")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return username

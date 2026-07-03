import os
import time
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

KEYCLOAK_BASE_URL = os.getenv("KEYCLOAK_BASE_URL", "http://localhost:8080")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "integrated-id")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "be-client")
KEYCLOAK_CLIENT_SECRET = os.getenv("KEYCLOAK_CLIENT_SECRET", "be-client-secret")

_REALM_URL = f"{KEYCLOAK_BASE_URL}/realms/{KEYCLOAK_REALM}"
TOKEN_ENDPOINT = f"{_REALM_URL}/protocol/openid-connect/token"
LOGOUT_ENDPOINT = f"{_REALM_URL}/protocol/openid-connect/logout"
JWKS_ENDPOINT = f"{_REALM_URL}/protocol/openid-connect/certs"

bearer_scheme = HTTPBearer()

_jwks_cache: dict = {"keys": None, "fetched_at": 0.0}
_JWKS_TTL_SECONDS = 300


async def login(username: str, password: str) -> dict:
    payload = {
        "grant_type": "password",
        "client_id": KEYCLOAK_CLIENT_ID,
        "client_secret": KEYCLOAK_CLIENT_SECRET,
        "username": username,
        "password": password,
        "scope": "openid profile email",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(TOKEN_ENDPOINT, data=payload)

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )
    return response.json()


async def refresh(refresh_token: str) -> dict:
    payload = {
        "grant_type": "refresh_token",
        "client_id": KEYCLOAK_CLIENT_ID,
        "client_secret": KEYCLOAK_CLIENT_SECRET,
        "refresh_token": refresh_token,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(TOKEN_ENDPOINT, data=payload)

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="세션이 만료되었습니다. 다시 로그인해 주세요.",
        )
    return response.json()


async def logout(refresh_token: str) -> None:
    payload = {
        "client_id": KEYCLOAK_CLIENT_ID,
        "client_secret": KEYCLOAK_CLIENT_SECRET,
        "refresh_token": refresh_token,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Keycloak returns 204 on success; a stale/already-invalid refresh
        # token is not worth surfacing as an error to the caller.
        await client.post(LOGOUT_ENDPOINT, data=payload)


async def _get_jwks_keys() -> list[dict]:
    now = time.monotonic()
    if _jwks_cache["keys"] is None or now - _jwks_cache["fetched_at"] > _JWKS_TTL_SECONDS:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(JWKS_ENDPOINT)
        response.raise_for_status()
        _jwks_cache["keys"] = response.json()["keys"]
        _jwks_cache["fetched_at"] = now
    return _jwks_cache["keys"]


async def decode_token(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    keys = await _get_jwks_keys()
    key = next((k for k in keys if k.get("kid") == header.get("kid")), None)
    if key is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown signing key")

    try:
        return jwt.decode(
            token,
            key,
            algorithms=[key.get("alg", "RS256")],
            options={"verify_aud": False, "verify_iss": False},
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="세션이 만료되었거나 유효하지 않습니다.",
        ) from exc


async def require_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> dict:
    return await decode_token(credentials.credentials)

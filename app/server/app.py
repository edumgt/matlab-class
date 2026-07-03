import json
import os
from pathlib import Path
from typing import Annotated

import uvicorn
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .auth import login as keycloak_login
from .auth import logout as keycloak_logout
from .auth import refresh as keycloak_refresh
from .auth import require_user
from .manufacturing import build_manufacturing_snapshot


BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
DATA_FILE = BASE_DIR / "data" / "stocks.json"
DIST_DIR = PROJECT_DIR / "dist"
HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", "8000"))

app = FastAPI(title="Python Stock Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets", check_dir=False), name="assets")


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


def load_stock_data() -> dict:
    try:
        with DATA_FILE.open("r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail="stock data file not found") from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="stock data file is invalid") from exc


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/login")
async def auth_login(body: LoginRequest) -> dict:
    return await keycloak_login(body.username, body.password)


@app.post("/api/auth/refresh")
async def auth_refresh(body: RefreshRequest) -> dict:
    return await keycloak_refresh(body.refresh_token)


@app.post("/api/auth/logout")
async def auth_logout(body: LogoutRequest) -> dict:
    await keycloak_logout(body.refresh_token)
    return {"status": "ok"}


@app.get("/api/auth/me")
async def auth_me(claims: Annotated[dict, Depends(require_user)]) -> dict:
    return {
        "username": claims.get("preferred_username"),
        "email": claims.get("email"),
        "name": claims.get("name"),
        "roles": claims.get("realm_access", {}).get("roles", []),
    }


@app.get("/api/stocks")
async def get_stocks(_claims: Annotated[dict, Depends(require_user)]) -> dict:
    return load_stock_data()


@app.get("/api/manufacturing")
async def get_manufacturing(_claims: Annotated[dict, Depends(require_user)]) -> dict:
    return build_manufacturing_snapshot()


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str):
    if DIST_DIR.is_dir():
        index_file = DIST_DIR / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)

    return {
        "message": "Python stock analysis backend",
        "endpoints": ["/api/health", "/api/stocks"],
    }


def main() -> None:
    uvicorn.run("server.app:app", host=HOST, port=PORT)


if __name__ == "__main__":
    main()

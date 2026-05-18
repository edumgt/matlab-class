import json
import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


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


@app.get("/api/stocks")
async def get_stocks() -> dict:
    return load_stock_data()


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

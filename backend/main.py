from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings, setup_logging
from routers import analyze, narrate

setup_logging()

app = FastAPI(title="SanpoLab API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.include_router(analyze.router)
app.include_router(narrate.router)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base

# Import all models so Alembic and Base.metadata see them
import app.models.user    # noqa: F401
import app.models.wallet  # noqa: F401

from app.routers import auth, webhooks, health, credit, match
# from app.routers import score  # Phase 2 — EkoScore ML (requires numpy, sklearn, shap)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

# ── Create tables (dev only — use Alembic migrations in production) ───────────
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Eko API",
    description="Intelligent economic platform for informal traders and job seekers",
    version="0.2.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else [
        "https://eko-trader.vercel.app",
        "https://eko-seeker.vercel.app",
        "https://eko-lender.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(webhooks.router)
# app.include_router(score.router)  # Phase 2 — EkoScore ML
app.include_router(credit.router)
app.include_router(match.router)

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole, TraderProfile
from app.schemas.score import (
    EkoScoreResponse, EkoScoreHistoryItem,
    CohortStatsResponse, ComputeScoreRequest,
)
from app.services.ekoscore import (
    compute_ekoscore, get_latest_score, get_score_history,
    _cold_start_score, COHORT_MEDIANS,
)

router = APIRouter(prefix="/score", tags=["EkoScore"])


def _get_trader_or_404(trader_id: int, db: Session) -> TraderProfile:
    trader = db.query(TraderProfile).filter(TraderProfile.id == trader_id).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    return trader


# ── Compute / trigger a fresh score ──────────────────────────────────────────

@router.post("/compute/{trader_id}", response_model=EkoScoreResponse)
def trigger_score_compute(
    trader_id: int,
    payload: ComputeScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger a fresh EkoScore computation.
    Accepts transaction history in the request body.
    In production, this is called by a daily cron that fetches from Squad API.
    Any authenticated user can trigger this (admin or the trader themselves).
    """
    trader = _get_trader_or_404(trader_id, db)

    # Parse timestamps
    transactions = []
    for t in payload.transactions:
        transactions.append({
            "amount": t["amount"],
            "created_at": datetime.fromisoformat(t["created_at"]).replace(tzinfo=timezone.utc),
        })

    record = compute_ekoscore(trader, transactions, db)
    return EkoScoreResponse.from_orm_extended(record)


# ── Get latest score ──────────────────────────────────────────────────────────

@router.get("/{trader_id}", response_model=EkoScoreResponse)
def get_score(
    trader_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the latest EkoScore for a trader, including full SHAP breakdown.
    Accessible by the trader themselves, lenders, and admins.
    """
    trader = _get_trader_or_404(trader_id, db)
    record = get_latest_score(trader_id, db)

    if not record:
        raise HTTPException(
            status_code=404,
            detail="No score found. POST to /score/compute/{trader_id} first.",
        )

    return EkoScoreResponse.from_orm_extended(record)


# ── Score history (for chart) ─────────────────────────────────────────────────

@router.get("/{trader_id}/history", response_model=list[EkoScoreHistoryItem])
def get_history(
    trader_id: int,
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Score over time — feeds the Recharts line chart on the dashboard."""
    _get_trader_or_404(trader_id, db)
    return get_score_history(trader_id, db, limit=limit)


# ── Cold-start ────────────────────────────────────────────────────────────────

@router.post("/cold-start/{trader_id}", response_model=EkoScoreResponse)
def assign_cold_start(
    trader_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Assign a cold-start baseline score to a new trader with no Squad history.
    Score is capped at 55 — below the 60 EkoCredit threshold.
    """
    trader = _get_trader_or_404(trader_id, db)
    record = _cold_start_score(trader, db)
    return EkoScoreResponse.from_orm_extended(record)


# ── Cohort stats ──────────────────────────────────────────────────────────────

@router.get("/cohort/{category}", response_model=CohortStatsResponse)
def cohort_stats(
    category: str,
    current_user: User = Depends(get_current_user),
):
    """
    Return cohort median transaction volume for a business category.
    Used internally by the scoring engine and exposed for lender transparency.
    """
    median = COHORT_MEDIANS.get(category.lower(), COHORT_MEDIANS.get("default", 750_000))
    return CohortStatsResponse(
        category=category,
        median_volume_ngn=int(median),
        sample_size=300,  # synthetic training set size
    )
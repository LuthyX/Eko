"""
Lender router — Phase 5 (monitoring only).

Model B: lender pre-funds a credit pool. They don't approve individual loans.
They monitor portfolio performance, repayment rates, and risk distribution.

Endpoints:
  GET /lender/portfolio              Aggregate stats + all traders with scores
  GET /lender/traders/{trader_id}    Trader detail — SHAP, loan history, repayments
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import (
    User, UserRole, TraderProfile,
    Loan, LoanStatus, EkoScore, RiskTier,
)

router = APIRouter(prefix="/lender", tags=["Lender"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class TraderSummary(BaseModel):
    trader_id: int
    user_id: int
    business_name: str | None
    business_category: str | None
    market_location: str | None
    ekoscore: float | None
    risk_tier: str | None
    active_loan_amount_naira: float | None
    active_loan_outstanding_naira: float | None
    active_loan_repaid_pct: float | None
    total_loans: int
    repayment_rate: float
    squad_linked: bool


class PortfolioResponse(BaseModel):
    total_traders_scored: int
    credit_eligible_traders: int
    total_deployed_naira: float
    total_outstanding_naira: float
    active_advances: int
    fully_repaid_advances: int
    overall_repayment_rate: float
    risk_distribution: dict
    traders: list[TraderSummary]


class LoanDetail(BaseModel):
    id: int
    amount_naira: float
    outstanding_naira: float
    fee_amount_naira: float
    total_repayable_naira: float
    repaid_naira: float
    repaid_pct: float
    sweep_rate_pct: float
    status: str
    disbursed_at: datetime | None
    created_at: datetime


class TraderDetailResponse(BaseModel):
    trader_id: int
    business_name: str | None
    business_category: str | None
    market_location: str | None
    full_name: str | None
    identity_tier: str | None
    squad_linked: bool
    ekoscore: float | None
    risk_tier: str | None
    is_cold_start: bool | None
    credit_eligible: bool
    max_advance_naira: int | None
    shap_values: dict | None
    score_computed_at: datetime | None
    loans: list[LoanDetail]
    active_loan: LoanDetail | None
    total_deployed_naira: float
    total_repaid_naira: float
    repayment_rate: float


# ── Helpers ───────────────────────────────────────────────────────────────────

def _latest_score(trader_id: int, db: Session) -> EkoScore | None:
    return (
        db.query(EkoScore)
        .filter(EkoScore.trader_id == trader_id)
        .order_by(EkoScore.computed_at.desc())
        .first()
    )


def _loan_detail(loan: Loan) -> LoanDetail:
    total_repayable = loan.amount + (loan.fee_amount or 0)
    repaid = total_repayable - loan.outstanding
    return LoanDetail(
        id=loan.id,
        amount_naira=loan.amount / 100,
        outstanding_naira=loan.outstanding / 100,
        fee_amount_naira=(loan.fee_amount or 0) / 100,
        total_repayable_naira=total_repayable / 100,
        repaid_naira=max(repaid, 0) / 100,
        repaid_pct=round(max(repaid, 0) / total_repayable * 100, 1) if total_repayable > 0 else 0,
        sweep_rate_pct=loan.sweep_rate_pct or 10.0,
        status=loan.status,
        disbursed_at=loan.disbursed_at,
        created_at=loan.created_at,
    )


def _build_trader_summary(trader: TraderProfile, db: Session) -> TraderSummary:
    score = _latest_score(trader.id, db)
    loans = db.query(Loan).filter(Loan.trader_id == trader.id).all()

    active_loan = next((l for l in loans if l.status == LoanStatus.active), None)
    repaid_loans = [l for l in loans if l.status == LoanStatus.repaid]
    countable = [l for l in loans if l.status in (LoanStatus.active, LoanStatus.repaid)]
    repayment_rate = len(repaid_loans) / len(countable) if countable else 1.0

    active_repaid_pct = None
    if active_loan:
        total_repayable = active_loan.amount + (active_loan.fee_amount or 0)
        repaid = total_repayable - active_loan.outstanding
        active_repaid_pct = round(max(repaid, 0) / total_repayable * 100, 1) if total_repayable > 0 else 0

    return TraderSummary(
        trader_id=trader.id,
        user_id=trader.user_id,
        business_name=trader.business_name,
        business_category=trader.business_category,
        market_location=trader.market_location,
        ekoscore=round(score.score, 1) if score else None,
        risk_tier=score.risk_tier if score else None,
        active_loan_amount_naira=active_loan.amount / 100 if active_loan else None,
        active_loan_outstanding_naira=active_loan.outstanding / 100 if active_loan else None,
        active_loan_repaid_pct=active_repaid_pct,
        total_loans=len(loans),
        repayment_rate=round(repayment_rate, 3),
        squad_linked=trader.squad_merchant_id is not None,
    )


# ── Portfolio overview ────────────────────────────────────────────────────────

@router.get("/portfolio", response_model=PortfolioResponse)
def get_portfolio(
    current_user: User = Depends(require_role(UserRole.lender)),
    db: Session = Depends(get_db),
):
    """
    Lender portfolio overview — aggregate stats + all traders with EkoScores.
    Sorted by EkoScore DESC — highest quality borrowers first.
    Read-only monitoring. Lender does not approve individual loans.
    """
    traders = db.query(TraderProfile).all()
    all_loans = db.query(Loan).all()

    active_loans = [l for l in all_loans if l.status == LoanStatus.active]
    repaid_loans = [l for l in all_loans if l.status == LoanStatus.repaid]
    countable = [l for l in all_loans if l.status in (LoanStatus.active, LoanStatus.repaid)]

    total_deployed = sum(
        l.amount for l in active_loans + repaid_loans
    ) / 100
    total_outstanding = sum(l.outstanding for l in active_loans) / 100
    overall_repayment_rate = len(repaid_loans) / len(countable) if countable else 1.0

    risk_dist: dict[str, int] = {"A": 0, "B": 0, "C": 0, "unscored": 0}
    credit_eligible = 0

    for trader in traders:
        score = _latest_score(trader.id, db)
        if score:
            if score.risk_tier == RiskTier.A:
                risk_dist["A"] += 1
            elif score.risk_tier == RiskTier.B:
                risk_dist["B"] += 1
            elif score.risk_tier == RiskTier.C:
                risk_dist["C"] += 1
            else:
                risk_dist["unscored"] += 1
            if score.score >= 60 and not score.is_cold_start:
                credit_eligible += 1
        else:
            risk_dist["unscored"] += 1

    summaries = [_build_trader_summary(t, db) for t in traders]
    summaries.sort(key=lambda s: s.ekoscore or 0, reverse=True)

    return PortfolioResponse(
        total_traders_scored=len([t for t in traders if _latest_score(t.id, db)]),
        credit_eligible_traders=credit_eligible,
        total_deployed_naira=total_deployed,
        total_outstanding_naira=total_outstanding,
        active_advances=len(active_loans),
        fully_repaid_advances=len(repaid_loans),
        overall_repayment_rate=round(overall_repayment_rate, 3),
        risk_distribution=risk_dist,
        traders=summaries,
    )


# ── Trader detail ─────────────────────────────────────────────────────────────

@router.get("/traders/{trader_id}", response_model=TraderDetailResponse)
def get_trader_detail(
    trader_id: int,
    current_user: User = Depends(require_role(UserRole.lender)),
    db: Session = Depends(get_db),
):
    """
    Full trader detail — EkoScore + SHAP breakdown, all loans, repayment history.
    Judges see the AI explainability story here.
    """
    trader = db.query(TraderProfile).filter(TraderProfile.id == trader_id).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    score = _latest_score(trader.id, db)
    loans = (
        db.query(Loan)
        .filter(Loan.trader_id == trader.id)
        .order_by(Loan.created_at.desc())
        .all()
    )

    active_loan = next((l for l in loans if l.status == LoanStatus.active), None)

    credit_eligible = (
        score is not None and
        score.score >= 60 and
        not score.is_cold_start and
        active_loan is None
    )
    max_advance = int((score.score / 100) * 500_000) if credit_eligible and score else None

    total_deployed = sum(
        l.amount for l in loans
        if l.status in (LoanStatus.active, LoanStatus.repaid)
    ) / 100
    total_repaid = sum(
        max((l.amount + (l.fee_amount or 0)) - l.outstanding, 0)
        for l in loans
        if l.status in (LoanStatus.active, LoanStatus.repaid)
    ) / 100
    countable = [l for l in loans if l.status in (LoanStatus.active, LoanStatus.repaid)]
    repaid_count = [l for l in loans if l.status == LoanStatus.repaid]
    repayment_rate = len(repaid_count) / len(countable) if countable else 1.0

    return TraderDetailResponse(
        trader_id=trader.id,
        business_name=trader.business_name,
        business_category=trader.business_category,
        market_location=trader.market_location,
        full_name=trader.user.full_name if trader.user else None,
        identity_tier=trader.user.identity_tier if trader.user else None,
        squad_linked=trader.squad_merchant_id is not None,
        ekoscore=round(score.score, 1) if score else None,
        risk_tier=score.risk_tier if score else None,
        is_cold_start=score.is_cold_start if score else None,
        credit_eligible=credit_eligible,
        max_advance_naira=max_advance,
        shap_values=score.shap_values if score else None,
        score_computed_at=score.computed_at if score else None,
        loans=[_loan_detail(l) for l in loans],
        active_loan=_loan_detail(active_loan) if active_loan else None,
        total_deployed_naira=total_deployed,
        total_repaid_naira=total_repaid,
        repayment_rate=round(repayment_rate, 3),
    )
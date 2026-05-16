from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole, TraderProfile
from app.schemas.credit import (
    CreditEligibilityResponse, CreditApplyRequest, LoanResponse,
    RepaymentResponse, SaveEnrollRequest, SaveAccountResponse,
    WalletResponse, WalletTransactionResponse,
    WithdrawalRequest, WithdrawalResponse,
    ManualRepaymentRequest, SweepRateUpdateRequest
)
from app.services.credit import (
    check_credit_eligibility, disburse_credit,
    get_active_loan, get_loan_history,
    enroll_ekosave, get_save_account,
    initiate_withdrawal, manual_repayment,
    CreditNotEligibleError, WithdrawalError,
)
from app.services.wallet import provision_wallet, get_wallet, get_transactions, InsufficientBalanceError
from app.models.user import Loan, Repayment
from pydantic import BaseModel, field_validator

router = APIRouter(tags=["Credit & Wallet"])


def _get_trader_profile(user: User, db: Session) -> TraderProfile:
    if not user.trader_profile:
        raise HTTPException(status_code=404, detail="Trader profile not found")
    return user.trader_profile


# ── Wallet ─────────────────────────────────────────────────────────────────────

@router.get("/wallet/me", response_model=WalletResponse)
def get_my_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's wallet balance and virtual account details."""
    wallet = get_wallet(current_user.id, db)
    if not wallet:
        # Provision on first access
        wallet = provision_wallet(current_user, db)
    return WalletResponse.from_orm_extended(wallet)


@router.get("/wallet/me/transactions", response_model=list[WalletTransactionResponse])
def get_my_transactions(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get wallet transaction history."""
    wallet = get_wallet(current_user.id, db)
    if not wallet:
        return []
    txns = get_transactions(wallet.id, db, limit=limit)
    return [WalletTransactionResponse.from_orm_extended(t) for t in txns]


@router.post("/wallet/withdraw", response_model=WithdrawalResponse)
def withdraw(
    payload: WithdrawalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Withdraw funds from Eko wallet to personal bank account via Squad."""
    try:
        result = initiate_withdrawal(
            user_id=current_user.id,
            amount_naira=payload.amount_naira,
            bank_code=payload.bank_code,
            account_number=payload.account_number,
            account_name=payload.account_name,
            db=db,
        )
        return WithdrawalResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── EkoCredit ──────────────────────────────────────────────────────────────────

@router.get("/credit/eligibility", response_model=CreditEligibilityResponse)
def credit_eligibility(
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """Check if the current trader is eligible for an EkoCredit advance."""
    trader = _get_trader_profile(current_user, db)
    result = check_credit_eligibility(trader, db)
    return CreditEligibilityResponse(**result)


@router.post("/credit/apply", response_model=LoanResponse)
def apply_for_credit(
    payload: CreditApplyRequest,
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """Apply for an EkoCredit advance. Disburses via Squad to trader's virtual account."""
    trader = _get_trader_profile(current_user, db)
    try:
        loan = disburse_credit(trader, payload.amount_naira, db, payload.requested_sweep_rate_pct)
        return LoanResponse.from_orm_extended(loan)
    except CreditNotEligibleError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Disbursement failed: {e}")


@router.get("/credit/loan/active", response_model=LoanResponse | None)
def active_loan(
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """Get the current trader's active loan if any."""
    trader = _get_trader_profile(current_user, db)
    loan = get_active_loan(trader.id, db)
    if not loan:
        return None
    return LoanResponse.from_orm_extended(loan)


@router.get("/credit/loan/history", response_model=list[LoanResponse])
def loan_history(
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """Get full loan history for the current trader."""
    trader = _get_trader_profile(current_user, db)
    loans = get_loan_history(trader.id, db)
    return [LoanResponse.from_orm_extended(l) for l in loans]


@router.post("/credit/loan/repay", response_model=RepaymentResponse)
def repay_loan_manually(
    payload: ManualRepaymentRequest,
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """
    Manually repay a portion or all of the active loan from the wallet balance.
    Works alongside auto-sweep — both reduce the same outstanding balance.
    Repayment is capped at the outstanding amount — no overpayment possible.
    """
    trader = _get_trader_profile(current_user, db)
    try:
        repayment = manual_repayment(trader, payload.amount_naira, db)
        return RepaymentResponse.from_orm_extended(repayment)
    except InsufficientBalanceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except CreditNotEligibleError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/credit/loan/{loan_id}/repayments", response_model=list[RepaymentResponse])
def loan_repayments(
    loan_id: int,
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """Get repayment history for a specific loan."""
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    repayments = (
        db.query(Repayment)
        .filter(Repayment.loan_id == loan_id)
        .order_by(Repayment.created_at.desc())
        .all()
    )
    return [RepaymentResponse.from_orm_extended(r) for r in repayments]


# ── EkoSave ────────────────────────────────────────────────────────────────────

@router.post("/save/enroll", response_model=SaveAccountResponse)
def enroll_save(
    payload: SaveEnrollRequest,
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """Enroll in EkoSave. Sweeps a percentage of every incoming Squad payment."""
    trader = _get_trader_profile(current_user, db)
    account = enroll_ekosave(trader, payload.sweep_percentage, db)
    return SaveAccountResponse.from_orm_extended(account)


@router.get("/save/me", response_model=SaveAccountResponse | None)
def my_save_account(
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """Get current trader's EkoSave account."""
    trader = _get_trader_profile(current_user, db)
    account = get_save_account(trader.id, db)
    if not account:
        return None
    return SaveAccountResponse.from_orm_extended(account)



@router.patch("/credit/loan/active/sweep-rate", response_model=LoanResponse)
def update_active_loan_sweep_rate(
    payload: SweepRateUpdateRequest,
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """
    Adjust the sweep rate on the active loan.
    Can only set at or above the risk-tier minimum — cannot go lower.
    Higher sweep rate = faster repayment = less interest risk.
    """
    trader = _get_trader_profile(current_user, db)
    loan = get_active_loan(trader.id, db)
    if not loan:
        raise HTTPException(status_code=404, detail="No active loan found")

    # Enforce minimum based on their score tier
    from app.services.credit import calculate_sweep_rate
    from app.services.ekoscore import get_latest_score
    score_record = get_latest_score(trader.id, db)
    minimum = calculate_sweep_rate(score_record.score) if score_record else 10.0

    if payload.sweep_rate_pct < minimum:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum sweep rate for your score tier is {minimum}%. You cannot go below this."
        )

    loan.sweep_rate_pct = payload.sweep_rate_pct
    db.commit()
    db.refresh(loan)

    logger.info(
        f"Sweep rate updated: trader={trader.id} loan={loan.id} "
        f"new_rate={payload.sweep_rate_pct}%"
    )
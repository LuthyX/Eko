"""
Credit service — Phase 3 (refactored for best-practice money flow).

Best-practice change from original:
  BEFORE: disburse_credit() credited the trader's wallet immediately after
          calling Squad. If Squad succeeded but the webhook was delayed/lost,
          the trader had a phantom balance.

  AFTER:  disburse_credit() creates the loan (pending) and calls Squad.
          The trader's wallet is only credited in webhooks.py when Squad
          fires transfer.success. Clean audit trail. No phantom balances.
          If Squad fails, the loan stays pending — nothing to reverse.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.user import (
    Loan, LoanStatus, Repayment, SaveAccount, TraderProfile,
)
from app.models.wallet import WalletTxType
from app.services.ekoscore import get_latest_score
from app.services.squad import (
    initiate_transfer, generate_idempotency_key, SquadAPIError,
)
from app.services.wallet import (
    get_wallet_or_error, credit, debit, InsufficientBalanceError,
)

logger = logging.getLogger(__name__)

EKOCREDIT_SCORE_THRESHOLD = 60
EKOSAVE_DEFAULT_SWEEP_PCT = 5.0
REPAYMENT_WINDOW_DAYS = 90


# ── Sweep rate calculator ─────────────────────────────────────────────────────

def calculate_sweep_rate(score: float) -> float:
    """
    Derive the mandatory minimum sweep rate from the trader's EkoScore.
    Higher score = lower rate = less pressure on cash flow.

    80–100  → 8%   (Tier A top)
    70–79   → 10%  (Tier A)
    60–69   → 13%  (Tier B — just above threshold, faster repayment needed)
    """
    if score >= 80:
        return 8.0
    elif score >= 70:
        return 10.0
    else:
        return 13.0


def estimate_repayment_days(
    amount_naira: int,
    sweep_rate_pct: float,
    avg_monthly_volume_naira: int,
) -> int:
    """
    Estimate how many days until the loan is repaid based on sweep rate
    and the trader's average monthly incoming volume.
    """
    if avg_monthly_volume_naira <= 0:
        return REPAYMENT_WINDOW_DAYS

    monthly_sweep = avg_monthly_volume_naira * (sweep_rate_pct / 100)
    if monthly_sweep <= 0:
        return REPAYMENT_WINDOW_DAYS

    months = amount_naira / monthly_sweep
    return min(int(months * 30), 365)


# ── EkoCredit eligibility ─────────────────────────────────────────────────────

def check_credit_eligibility(trader: TraderProfile, db: Session) -> dict:
    """
    Check if a trader is eligible for an EkoCredit advance.
    Returns eligibility, max advance, risk-based sweep rate, and loan terms.
    """
    score = get_latest_score(trader.id, db)
    if not score or score.is_cold_start:
        return {
            "eligible": False,
            "reason": "No sufficient transaction history yet",
            "score": score.score if score else None,
            "threshold": EKOCREDIT_SCORE_THRESHOLD,
        }

    if score.score < EKOCREDIT_SCORE_THRESHOLD:
        return {
            "eligible": False,
            "reason": f"EkoScore {score.score:.1f} is below the {EKOCREDIT_SCORE_THRESHOLD} threshold",
            "score": score.score,
            "threshold": EKOCREDIT_SCORE_THRESHOLD,
        }

    active_loan = (
        db.query(Loan)
        .filter(Loan.trader_id == trader.id, Loan.status.in_([LoanStatus.active, LoanStatus.pending]))
        .first()
    )
    if active_loan:
        return {
            "eligible": False,
            "reason": "You have an active loan. Repay before applying for another.",
            "score": score.score,
            "outstanding_naira": active_loan.outstanding / 100,
        }

    max_advance_naira = min(int((score.score / 100) * 500_000), 500_000)
    sweep_rate = calculate_sweep_rate(score.score)

    vol_score = score.transaction_volume_score or 0
    avg_monthly_volume = int((vol_score / 100) * 2_000_000 / 3)
    est_days = estimate_repayment_days(max_advance_naira, sweep_rate, avg_monthly_volume)

    return {
        "eligible": True,
        "score": score.score,
        "risk_tier": score.risk_tier,
        "max_advance_naira": max_advance_naira,
        "threshold": EKOCREDIT_SCORE_THRESHOLD,
        "terms": {
            "minimum_sweep_rate_pct": sweep_rate,
            "repayment_window_days": REPAYMENT_WINDOW_DAYS,
            "repayment_method": "Automatic sweep from every incoming Squad payment",
            "manual_repayment": "Allowed anytime, no penalty",
            "early_repayment_penalty": "None",
            "estimated_repayment_days": est_days,
            "over_window_warning": est_days > REPAYMENT_WINDOW_DAYS,
        },
    }


# ── EkoCredit disbursement (refactored) ───────────────────────────────────────

def disburse_credit(
    trader: TraderProfile,
    amount_naira: int,
    db: Session,
    requested_sweep_rate_pct: float | None = None,
) -> Loan:
    """
    Initiate an EkoCredit advance.

    Refactored best-practice flow:
      1. Validate eligibility
      2. Create Loan record (status: pending)
      3. Call Squad transfer API
      4. Return the pending loan — UI shows "processing"
      5. webhooks.py _confirm_credit_disbursement() fires on transfer.success:
           - Credits trader's wallet
           - Sets loan.status = active
           - Sets loan.disbursed_at

    The trader's wallet is NOT credited here. It is credited only when
    Squad confirms the transfer. This prevents phantom balances.
    """
    eligibility = check_credit_eligibility(trader, db)
    if not eligibility["eligible"]:
        raise CreditNotEligibleError(eligibility["reason"])

    if amount_naira > eligibility["max_advance_naira"]:
        raise CreditNotEligibleError(
            f"Requested ₦{amount_naira:,} exceeds max advance ₦{eligibility['max_advance_naira']:,}"
        )

    minimum_sweep = eligibility["terms"]["minimum_sweep_rate_pct"]

    if requested_sweep_rate_pct is not None:
        if requested_sweep_rate_pct < minimum_sweep:
            raise CreditNotEligibleError(
                f"Requested sweep rate {requested_sweep_rate_pct}% is below "
                f"your minimum rate of {minimum_sweep}%"
            )
        if requested_sweep_rate_pct > 50:
            raise CreditNotEligibleError("Sweep rate cannot exceed 50%")
        final_sweep_rate = requested_sweep_rate_pct
    else:
        final_sweep_rate = minimum_sweep

    idempotency_key = generate_idempotency_key("CREDIT")
    amount_kobo = amount_naira * 100

    # ── Step 1: Create loan in pending state ──────────────────────────────────
    loan = Loan(
        trader_id=trader.id,
        amount=amount_kobo,
        outstanding=amount_kobo,
        status=LoanStatus.pending,
        idempotency_key=idempotency_key,
        sweep_rate_pct=final_sweep_rate,
        requested_sweep_rate_pct=requested_sweep_rate_pct,
        repayment_window_days=REPAYMENT_WINDOW_DAYS,
    )
    db.add(loan)
    db.flush()

    # ── Step 2: Call Squad transfer API ───────────────────────────────────────
    wallet = get_wallet_or_error(trader.user_id, db)

    if wallet.virtual_account_number:
        try:
            transfer_data = initiate_transfer(
                amount=amount_naira,
                bank_code=_get_bank_code(wallet.virtual_bank_name),
                account_number=wallet.virtual_account_number,
                account_name=wallet.virtual_account_name or trader.user.full_name,
                narration=f"EkoCredit advance — Loan #{loan.id}",
                idempotency_key=idempotency_key,
            )
            squad_ref = transfer_data.get("transaction_ref")
            loan.squad_transaction_ref = squad_ref
            logger.info(f"EkoCredit Squad transfer initiated: loan={loan.id} ref={squad_ref}")
        except SquadAPIError as e:
            # Loan stays pending — webhook will never fire — flag for manual review
            logger.error(
                f"Squad transfer failed for loan {loan.id}: {e} "
                f"— loan stays pending, manual review required"
            )
            # Don't raise — return the pending loan so the API doesn't 500
            # In production: enqueue a retry job here
    else:
        logger.warning(
            f"Trader {trader.id} has no virtual account — "
            f"loan {loan.id} pending, manual disbursement required"
        )

    # ── Step 3: Commit pending loan ───────────────────────────────────────────
    # Wallet credit happens in webhooks.py _confirm_credit_disbursement()
    db.commit()
    db.refresh(loan)

    logger.info(
        f"EkoCredit initiated: trader={trader.id} amount=₦{amount_naira:,} "
        f"loan={loan.id} status=pending (awaiting Squad webhook)"
    )
    return loan


# ── Manual repayment ──────────────────────────────────────────────────────────

def manual_repayment(
    trader: TraderProfile,
    amount_naira: int,
    db: Session,
) -> Repayment:
    """
    Trader manually repays a portion (or all) of their active loan
    by deducting from their internal wallet balance.

    No Squad API call needed — money is already in the wallet.
    Works alongside auto-sweep — both reduce the same outstanding balance.
    """
    active_loan = get_active_loan(trader.id, db)
    if not active_loan:
        raise CreditNotEligibleError("No active loan to repay")

    amount_kobo = min(amount_naira * 100, active_loan.outstanding)
    if amount_kobo <= 0:
        raise CreditNotEligibleError("Loan is already fully repaid")

    wallet = get_wallet_or_error(trader.user_id, db)
    idempotency_key = generate_idempotency_key("MANUALREPAY")

    try:
        debit(
            wallet=wallet,
            amount_kobo=amount_kobo,
            tx_type=WalletTxType.debit_loan_repayment,
            idempotency_key=idempotency_key,
            db=db,
            description=f"Manual loan repayment ₦{amount_kobo/100:,.2f}",
            loan_id=active_loan.id,
        )
    except InsufficientBalanceError:
        raise InsufficientBalanceError(
            f"Wallet balance ₦{wallet.balance_kobo/100:,.2f} is insufficient "
            f"for repayment of ₦{amount_kobo/100:,.2f}"
        )

    repayment = Repayment(
        loan_id=active_loan.id,
        amount=amount_kobo,
        idempotency_key=idempotency_key,
    )
    db.add(repayment)

    active_loan.outstanding -= amount_kobo
    if active_loan.outstanding <= 0:
        active_loan.outstanding = 0
        active_loan.status = LoanStatus.repaid
        logger.info(f"Loan {active_loan.id} fully repaid via manual payment")

    db.commit()
    db.refresh(repayment)

    logger.info(
        f"Manual repayment: trader={trader.id} "
        f"amount=₦{amount_kobo/100:,.2f} "
        f"outstanding=₦{active_loan.outstanding/100:,.2f}"
    )
    return repayment


def get_active_loan(trader_id: int, db: Session) -> Loan | None:
    return (
        db.query(Loan)
        .filter(Loan.trader_id == trader_id, Loan.status == LoanStatus.active)
        .first()
    )


def get_loan_history(trader_id: int, db: Session) -> list[Loan]:
    return (
        db.query(Loan)
        .filter(Loan.trader_id == trader_id)
        .order_by(Loan.created_at.desc())
        .all()
    )


# ── Repayment sweep (called by webhook handler on charge.success) ─────────────

def process_repayment_sweep(
    trader: TraderProfile,
    incoming_amount_kobo: int,
    squad_webhook_ref: str,
    db: Session,
) -> Repayment | None:
    """
    Called when a charge.success webhook fires for a trader.
    Sweeps sweep_rate_pct of the incoming payment toward the active loan.
    Also triggers EkoSave sweep.
    Note: only sweeps against ACTIVE loans — pending loans don't get swept.
    """
    active_loan = get_active_loan(trader.id, db)

    repayment = None
    if active_loan:
        sweep_rate = active_loan.sweep_rate_pct or 10.0
        sweep_amount = int(incoming_amount_kobo * (sweep_rate / 100))
        sweep_amount = min(sweep_amount, active_loan.outstanding)

        if sweep_amount > 0:
            idempotency_key = f"REPAY_{squad_webhook_ref}"

            existing = (
                db.query(Repayment)
                .filter(Repayment.squad_webhook_ref == squad_webhook_ref)
                .first()
            )
            if existing:
                logger.info(f"Repayment already processed for ref {squad_webhook_ref}")
                return existing

            wallet = get_wallet_or_error(trader.user_id, db)

            try:
                debit(
                    wallet=wallet,
                    amount_kobo=sweep_amount,
                    tx_type=WalletTxType.debit_loan_repayment,
                    idempotency_key=idempotency_key,
                    db=db,
                    squad_reference=squad_webhook_ref,
                    description=f"EkoCredit auto-repayment ({sweep_rate}% sweep)",
                    loan_id=active_loan.id,
                )
            except InsufficientBalanceError:
                logger.warning(f"Insufficient balance for repayment sweep: trader={trader.id}")
                return None

            repayment = Repayment(
                loan_id=active_loan.id,
                amount=sweep_amount,
                squad_webhook_ref=squad_webhook_ref,
                idempotency_key=idempotency_key,
            )
            db.add(repayment)

            active_loan.outstanding -= sweep_amount
            if active_loan.outstanding <= 0:
                active_loan.outstanding = 0
                active_loan.status = LoanStatus.repaid
                logger.info(f"Loan {active_loan.id} fully repaid via sweep")

            db.flush()

    _process_ekosave_sweep(trader, incoming_amount_kobo, squad_webhook_ref, db)
    db.commit()
    return repayment


# ── EkoSave ───────────────────────────────────────────────────────────────────

def enroll_ekosave(trader: TraderProfile, sweep_pct: float, db: Session) -> SaveAccount:
    existing = db.query(SaveAccount).filter(SaveAccount.trader_id == trader.id).first()
    if existing:
        existing.is_active = True
        existing.sweep_percentage = sweep_pct
        db.commit()
        db.refresh(existing)
        return existing

    account = SaveAccount(
        trader_id=trader.id,
        balance=0,
        sweep_percentage=sweep_pct,
        is_active=True,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def _process_ekosave_sweep(
    trader: TraderProfile,
    incoming_amount_kobo: int,
    squad_ref: str,
    db: Session,
):
    save_account = (
        db.query(SaveAccount)
        .filter(SaveAccount.trader_id == trader.id, SaveAccount.is_active == True)
        .first()
    )
    if not save_account:
        return

    sweep_pct = save_account.sweep_percentage or EKOSAVE_DEFAULT_SWEEP_PCT
    sweep_amount = int(incoming_amount_kobo * (sweep_pct / 100))

    if sweep_amount <= 0:
        return

    idempotency_key = f"SAVE_{squad_ref}"
    wallet = get_wallet_or_error(trader.user_id, db)

    try:
        debit(
            wallet=wallet,
            amount_kobo=sweep_amount,
            tx_type=WalletTxType.debit_ekosave_sweep,
            idempotency_key=idempotency_key,
            db=db,
            squad_reference=squad_ref,
            description=f"EkoSave auto-sweep ({sweep_pct}%)",
        )
        save_account.balance += sweep_amount
        db.flush()
        logger.info(f"EkoSave sweep: trader={trader.id} amount=₦{sweep_amount/100:.2f}")
    except Exception as e:
        logger.warning(f"EkoSave sweep failed: {e}")


def get_save_account(trader_id: int, db: Session) -> SaveAccount | None:
    return db.query(SaveAccount).filter(SaveAccount.trader_id == trader_id).first()


# ── Withdrawal ────────────────────────────────────────────────────────────────

def initiate_withdrawal(
    user_id: int,
    amount_naira: int,
    bank_code: str,
    account_number: str,
    account_name: str,
    db: Session,
) -> dict:
    """
    User withdraws funds from their Eko wallet to their personal bank account.
    Debits internal wallet immediately, calls Squad transfer API.
    Withdrawal is a user-initiated action — debit is confirmed at their request.
    """
    wallet = get_wallet_or_error(user_id, db)
    amount_kobo = amount_naira * 100

    if wallet.balance_kobo < amount_kobo:
        raise InsufficientBalanceError(
            f"Insufficient balance: ₦{wallet.balance_kobo/100:.2f} available"
        )

    idempotency_key = generate_idempotency_key("WITHDRAW")

    squad_ref = None
    try:
        transfer_data = initiate_transfer(
            amount=amount_naira,
            bank_code=bank_code,
            account_number=account_number,
            account_name=account_name,
            narration="Eko wallet withdrawal",
            idempotency_key=idempotency_key,
        )
        squad_ref = transfer_data.get("transaction_ref")
    except SquadAPIError as e:
        raise WithdrawalError(f"Transfer failed: {e}")

    debit(
        wallet=wallet,
        amount_kobo=amount_kobo,
        tx_type=WalletTxType.debit_withdrawal,
        idempotency_key=idempotency_key,
        db=db,
        squad_reference=squad_ref,
        description=f"Withdrawal to {account_number}",
    )

    db.commit()
    return {"reference": squad_ref, "amount_naira": amount_naira, "status": "processing"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_bank_code(bank_name: str | None) -> str:
    BANK_CODES = {
        "Wema Bank": "035",
        "GTBank": "058",
        "Access Bank": "044",
        "Zenith Bank": "057",
        "First Bank": "011",
        "UBA": "033",
    }
    if not bank_name:
        return "035"
    for name, code in BANK_CODES.items():
        if name.lower() in bank_name.lower():
            return code
    return "035"


class CreditNotEligibleError(Exception):
    pass


class WithdrawalError(Exception):
    pass

"""
Squad webhook receiver — Phase 3 + Phase 4.

All Squad events hit POST /webhooks/squad.
We verify the signature, log the payload, then route to the right handler.
Every handler is idempotent — safe to replay.

Best-practice money flow:
  OUTBOUND transfers (EkoCredit disbursement, wage payouts):
    - Wallet is DEBITED at initiation time (money leaves the sender — confirmed)
    - Wallet is CREDITED only here, when Squad confirms transfer.success
    - This prevents phantom balances if the transfer fails

  INBOUND payments (charge.success):
    - Wallet is CREDITED immediately (money is already in Squad's system)
    - Repayment sweep and EkoSave sweep follow immediately
"""
import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def _verify_squad_signature(body: bytes, signature: str | None) -> bool:
    if not settings.SQUAD_WEBHOOK_SECRET or settings.ENVIRONMENT == "development":
        logger.warning("Skipping Squad signature verification (dev mode)")
        return True
    if not signature:
        return False
    expected = hmac.new(
        settings.SQUAD_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, signature.lower())


@router.post("/squad")
async def squad_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_squad_signature: str | None = Header(default=None),
):
    body = await request.body()

    if not _verify_squad_signature(body, x_squad_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Malformed JSON payload")

    event_type: str = payload.get("event", "unknown")
    reference: str = payload.get("data", {}).get("transaction_ref", "")

    logger.info(f"Squad webhook received: event={event_type} ref={reference}")

    if event_type == "charge.success":
        _handle_charge_success(payload, db)
    elif event_type == "transfer.success":
        _handle_transfer_success(payload, db)
    elif event_type == "transfer.failed":
        _handle_transfer_failed(payload, db)
    else:
        logger.info(f"Unhandled Squad event type: {event_type}")

    # Always return 200 — Squad retries on non-2xx
    return {"status": "received", "event": event_type}


# ── Inbound payment handler ───────────────────────────────────────────────────

def _handle_charge_success(payload: dict, db: Session):
    """
    Fires when a trader's virtual account receives an incoming payment.
    1. Credit trader's internal wallet (inbound = safe to credit immediately)
    2. Sweep repayment % toward active loan
    3. Sweep EkoSave %
    """
    from app.models.user import TraderProfile
    from app.models.wallet import Wallet, WalletTransaction, WalletTxType
    from app.services.wallet import credit, get_wallet
    from app.services.credit import process_repayment_sweep
    from app.services.squad import generate_idempotency_key

    data = payload.get("data", {})
    squad_ref = data.get("transaction_ref", "")
    amount_kobo = int(data.get("amount", 0))
    customer_identifier = data.get("customer_identifier") or data.get("merchantId", "")

    if not squad_ref or amount_kobo <= 0:
        logger.warning(f"charge.success missing ref or amount: {data}")
        return

    wallet = (
        db.query(Wallet)
        .filter(Wallet.squad_customer_identifier == customer_identifier)
        .first()
    )
    if not wallet:
        logger.warning(f"No wallet found for customer_identifier={customer_identifier}")
        return

    # Idempotency — skip if already processed
    from app.models.wallet import WalletTransaction
    existing = (
        db.query(WalletTransaction)
        .filter(
            WalletTransaction.squad_reference == squad_ref,
            WalletTransaction.tx_type == WalletTxType.credit_payment_received,
        )
        .first()
    )
    if existing:
        logger.info(f"charge.success already processed: ref={squad_ref}")
        return

    # Credit wallet — inbound payments are safe to credit immediately
    try:
        credit(
            wallet=wallet,
            amount_kobo=amount_kobo,
            tx_type=WalletTxType.credit_payment_received,
            idempotency_key=f"CHARGE_{squad_ref}",
            db=db,
            squad_reference=squad_ref,
            description=f"Incoming payment ₦{amount_kobo/100:,.2f}",
        )
        db.flush()
    except Exception as e:
        logger.error(f"Failed to credit wallet for charge {squad_ref}: {e}")
        return

    # Trigger sweeps
    trader = (
        db.query(TraderProfile)
        .filter(TraderProfile.user_id == wallet.user_id)
        .first()
    )
    if trader:
        process_repayment_sweep(trader, amount_kobo, squad_ref, db)
    else:
        db.commit()

    logger.info(f"charge.success processed: ref={squad_ref} amount=₦{amount_kobo/100:,.2f}")


# ── Outbound transfer confirmation ────────────────────────────────────────────

def _handle_transfer_success(payload: dict, db: Session):
    """
    Fires when an outbound Squad transfer completes.

    This is where we CREDIT the receiver's wallet — not at initiation time.
    That's the best-practice pattern: debit sender at initiation, credit receiver
    only when Squad confirms the money actually moved.

    Handles two transfer types:
      CREDIT_*  — EkoCredit disbursement to trader
      WAGE_*    — Wage payout to job seeker
    """
    data = payload.get("data", {})
    ref = data.get("transaction_ref", "")

    if ref.startswith("CREDIT_"):
        _confirm_credit_disbursement(ref, db)

    elif ref.startswith("WAGE_"):
        _confirm_wage_payout(ref, db)

    else:
        logger.info(f"transfer.success — unrecognised ref prefix: {ref}")


def _confirm_credit_disbursement(ref: str, db: Session):
    """
    Squad confirmed the EkoCredit disbursement reached the trader.
    Now credit the trader's wallet.

    Refactored from original: previously credited immediately at disburse_credit().
    Now follows best practice — credit only on webhook confirmation.
    """
    from app.models.user import Loan, LoanStatus
    from app.models.wallet import WalletTxType
    from app.services.wallet import get_wallet_or_error, credit

    loan = db.query(Loan).filter(Loan.idempotency_key == ref).first()
    if not loan:
        logger.warning(f"No loan found for ref={ref}")
        return

    # Idempotency — skip if loan already active (already processed)
    if loan.status == LoanStatus.active:
        logger.info(f"Credit disbursement already confirmed: ref={ref}")
        return

    if loan.status != LoanStatus.pending:
        logger.warning(f"Loan {loan.id} in unexpected status {loan.status} for ref={ref}")
        return

    try:
        trader_wallet = get_wallet_or_error(loan.trader.user_id, db)
        credit(
            wallet=trader_wallet,
            amount_kobo=loan.amount,
            tx_type=WalletTxType.credit_loan_disbursement,
            idempotency_key=f"{ref}_WALLET",
            db=db,
            squad_reference=ref,
            description=f"EkoCredit advance ₦{loan.amount/100:,.2f} — confirmed",
            loan_id=loan.id,
        )
    except Exception as e:
        logger.error(f"Failed to credit trader wallet for loan {loan.id}: {e}")
        return

    # Activate loan now that money is confirmed in trader's wallet
    loan.status = LoanStatus.active
    loan.squad_transaction_ref = ref
    loan.disbursed_at = datetime.now(timezone.utc)
    db.commit()

    logger.info(f"EkoCredit disbursement confirmed: loan={loan.id} ref={ref} amount=₦{loan.amount/100:,.2f}")


def _confirm_wage_payout(ref: str, db: Session):
    """
    Squad confirmed the wage transfer reached the job seeker.
    Now credit the job seeker's wallet.

    The trader's wallet was already debited when they marked the job complete.
    This is the second half of the best-practice two-step payout.
    """
    from app.models.user import Match, MatchStatus
    from app.models.wallet import WalletTxType
    from app.services.wallet import get_wallet_or_error, credit

    match = db.query(Match).filter(Match.payout_idempotency_key == ref).first()
    if not match:
        logger.warning(f"No match found for payout ref={ref}")
        return

    # Idempotency — skip if already paid
    if match.paid_at is not None:
        logger.info(f"Wage payout already confirmed: ref={ref}")
        return

    opp = match.opportunity
    total_pay_kobo = opp.daily_pay * opp.duration_days * 100

    # Credit job seeker wallet — Squad confirmed the money arrived
    try:
        seeker_wallet = get_wallet_or_error(match.job_seeker.user_id, db)
        credit(
            wallet=seeker_wallet,
            amount_kobo=total_pay_kobo,
            tx_type=WalletTxType.credit_wage_received,
            idempotency_key=f"{ref}_SEEKER",
            db=db,
            squad_reference=ref,
            description=f"Wage received — {opp.title} ({opp.duration_days}d × ₦{opp.daily_pay:,})",
            match_id=match.id,
        )
    except Exception as e:
        logger.error(f"Failed to credit job seeker wallet for match {match.id}: {e}")
        return

    # Mark match as fully paid and completed
    match.squad_payout_ref = ref
    match.paid_at = datetime.now(timezone.utc)
    match.status = MatchStatus.completed
    db.commit()

    logger.info(
        f"Wage payout confirmed: match={match.id} ref={ref} "
        f"seeker={match.job_seeker_id} amount=₦{total_pay_kobo/100:,.2f}"
    )


# ── Failed transfer ───────────────────────────────────────────────────────────

def _handle_transfer_failed(payload: dict, db: Session):
    """
    Fires when an outbound Squad transfer fails.

    For WAGE_ failures: the trader's wallet was already debited.
    We must refund the trader and mark the match for manual review.

    For CREDIT_ failures: the loan stays in pending — no wallet credit happened.
    Mark loan as failed for manual review.
    """
    from app.models.user import Loan, LoanStatus, Match
    from app.models.wallet import WalletTxType
    from app.services.wallet import get_wallet_or_error, credit

    data = payload.get("data", {})
    ref = data.get("transaction_ref", "")
    reason = data.get("response_description", "Unknown reason")

    logger.error(f"transfer.failed: ref={ref} reason={reason}")

    if ref.startswith("WAGE_"):
        # Refund trader — their wallet was already debited at complete_job()
        match = db.query(Match).filter(Match.payout_idempotency_key == ref).first()
        if match and match.paid_at is None:
            opp = match.opportunity
            total_pay_kobo = opp.daily_pay * opp.duration_days * 100
            try:
                trader_wallet = get_wallet_or_error(match.opportunity.trader.user_id, db)
                credit(
                    wallet=trader_wallet,
                    amount_kobo=total_pay_kobo,
                    tx_type=WalletTxType.credit_payment_received,  # refund credit
                    idempotency_key=f"{ref}_REFUND",
                    db=db,
                    squad_reference=ref,
                    description=f"Wage payout failed — refund for {opp.title}",
                    match_id=match.id,
                )
                db.commit()
                logger.info(f"Trader refunded for failed wage payout: ref={ref} match={match.id}")
            except Exception as e:
                logger.error(f"Failed to refund trader for failed payout ref={ref}: {e} — MANUAL REVIEW REQUIRED")

    elif ref.startswith("CREDIT_"):
        # Loan stays pending — no wallet credit happened so nothing to reverse
        loan = db.query(Loan).filter(Loan.idempotency_key == ref).first()
        if loan and loan.status == LoanStatus.pending:
            loan.status = LoanStatus.defaulted  # reuse field — means "failed to disburse"
            db.commit()
            logger.error(f"EkoCredit disbursement failed: loan={loan.id} ref={ref} — MANUAL REVIEW REQUIRED")

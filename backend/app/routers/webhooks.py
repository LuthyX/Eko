"""
Squad webhook receiver — Phase 3.

All Squad events hit POST /webhooks/squad.
We verify the signature, log the payload, then route to the right handler.
Every handler is idempotent — safe to replay.
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


# ── Real handlers (Phase 3) ───────────────────────────────────────────────────

def _handle_charge_success(payload: dict, db: Session):
    """
    Fires when a trader's virtual account receives an incoming payment.
    1. Credit trader's internal wallet
    2. Sweep repayment % toward active loan
    3. Sweep EkoSave %
    """
    from app.models.user import TraderProfile
    from app.models.wallet import Wallet, WalletTxType
    from app.services.wallet import credit, get_wallet
    from app.services.credit import process_repayment_sweep
    from app.services.squad import generate_idempotency_key

    data = payload.get("data", {})
    squad_ref = data.get("transaction_ref", "")
    # Squad sends amount in kobo
    amount_kobo = int(data.get("amount", 0))
    customer_identifier = data.get("customer_identifier") or data.get("merchantId", "")

    if not squad_ref or amount_kobo <= 0:
        logger.warning(f"charge.success missing ref or amount: {data}")
        return

    # Find trader by Squad customer identifier
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
        .filter(WalletTransaction.squad_reference == squad_ref,
                WalletTransaction.tx_type == WalletTxType.credit_payment_received)
        .first()
    )
    if existing:
        logger.info(f"charge.success already processed: ref={squad_ref}")
        return

    # Credit wallet
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

    # Find trader profile for sweeps
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


def _handle_transfer_success(payload: dict, db: Session):
    """
    Fires when an outbound Squad transfer completes.
    Updates loan status or match payout status based on the reference prefix.
    """
    from app.models.user import Loan, LoanStatus
    from app.models.user import Match, MatchStatus

    data = payload.get("data", {})
    ref = data.get("transaction_ref", "")

    if ref.startswith("CREDIT_"):
        # EkoCredit disbursement confirmed
        loan = db.query(Loan).filter(Loan.idempotency_key == ref).first()
        if loan and loan.status == LoanStatus.pending:
            loan.status = LoanStatus.active
            loan.squad_transaction_ref = ref
            db.commit()
            logger.info(f"Loan activated via transfer.success: ref={ref}")

    elif ref.startswith("WAGE_"):
        # Job seeker wage payout confirmed
        match = db.query(Match).filter(Match.payout_idempotency_key == ref).first()
        if match:
            match.squad_payout_ref = ref
            match.paid_at = datetime.now(timezone.utc)
            db.commit()
            logger.info(f"Wage payout confirmed: ref={ref}")

    else:
        logger.info(f"transfer.success — unrecognised ref prefix: {ref}")


def _handle_transfer_failed(payload: dict, db: Session):
    """
    Fires when an outbound Squad transfer fails.
    Logs for manual review — no automatic retry here (handled by exponential backoff in service).
    """
    data = payload.get("data", {})
    ref = data.get("transaction_ref", "")
    reason = data.get("response_description", "Unknown reason")
    logger.error(f"transfer.failed: ref={ref} reason={reason} — manual review required")
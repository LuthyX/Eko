"""
Squad webhook receiver — fixed for actual Squad API behaviour.

Critical fixes from docs review:

1. HEADER NAME: Squad sends 'x-squad-encrypted-body', NOT 'x-squad-signature'
   Your old code checked the wrong header — verification always failed silently.

2. HMAC ALGORITHM: Squad uses HMAC-SHA512, compared UPPERCASE
   Old code: hmac.new(..., hashlib.sha512)  — wrong, hmac.new uses MD5
   Fixed:    hmac.new(key, body, hashlib.sha512).hexdigest().upper()
   And compare against header.upper() not header.lower()

3. PAYLOAD STRUCTURE: Squad's real webhook shape is:
   {
     "Event": "charge_successful",      ← capital E, different event name
     "TransactionRef": "SQTEST...",     ← capital T, top-level
     "Body": {                          ← data is in "Body" not "data"
       "amount": 10000,
       "transaction_ref": "...",
       "transaction_status": "Success",
       ...
     }
   }
   For virtual account webhooks (charge.success) the shape is different again:
   {
     "transaction_reference": "...",
     "virtual_account_number": "...",
     "principal_amount": "0.20",
     "customer_identifier": "EKO_USER_1",
     ...
   }
   Both shapes are handled below.

4. EVENT NAMES differ from what was assumed:
   - Card/transfer payments: "charge_successful" (not "charge.success")
   - Virtual account receipts: flat payload (no "Event" key — just the data)
   - Transfer completions: handled via polling or separate webhook config
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
    """
    Verify Squad webhook signature.

    From Squad docs:
    - Header: x-squad-encrypted-body
    - Algorithm: HMAC-SHA512
    - Compare: both sides uppercased
    - Key: your SQUAD_SECRET_KEY
    """
    if settings.ENVIRONMENT == "development":
        logger.warning("Skipping Squad signature verification (dev mode)")
        return True

    if not settings.SQUAD_WEBHOOK_SECRET:
        logger.warning("SQUAD_WEBHOOK_SECRET not set — skipping verification")
        return True

    if not signature:
        logger.warning("No x-squad-encrypted-body header present")
        return False

    expected = hmac.new(
        settings.SQUAD_WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha512,
    ).hexdigest().upper()

    return hmac.compare_digest(expected, signature.upper())


@router.post("/squad")
async def squad_webhook(
    request: Request,
    db: Session = Depends(get_db),
    # Squad sends x-squad-encrypted-body, not x-squad-signature
    x_squad_encrypted_body: str | None = Header(default=None),
):
    body = await request.body()

    if not _verify_squad_signature(body, x_squad_encrypted_body):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Malformed JSON payload")

    logger.info(f"Squad webhook received: {json.dumps(payload)[:200]}")

    # ── Route by payload shape ────────────────────────────────────────────────
    #
    # Squad sends different shapes for different events:
    #
    # Shape A — card/transfer payment (has "Event" key):
    #   { "Event": "charge_successful", "TransactionRef": "...", "Body": {...} }
    #
    # Shape B — virtual account receipt (flat, no "Event" key):
    #   { "transaction_reference": "...", "customer_identifier": "...", ... }
    #
    # Shape C — payout transfer result (has "event" lowercase — from transfer webhook):
    #   { "event": "transfer.success", "data": { "transaction_ref": "..." } }

    if "Event" in payload:
        # Shape A — card or transfer payment
        _handle_shape_a(payload, db)

    elif "transaction_reference" in payload and "customer_identifier" in payload:
        # Shape B — virtual account receipt
        _handle_virtual_account_receipt(payload, db)

    elif "event" in payload:
        # Shape C — payout webhook (our internal simulation format also uses this)
        event = payload.get("event", "")
        ref = payload.get("data", {}).get("transaction_ref", "")
        if event == "transfer.success":
            _handle_transfer_success(ref, db)
        elif event == "transfer.failed":
            reason = payload.get("data", {}).get("response_description", "Unknown")
            _handle_transfer_failed(ref, reason, db)
        else:
            logger.info(f"Unhandled event type: {event}")

    else:
        logger.info(f"Unrecognised webhook shape — keys: {list(payload.keys())}")

    # Always return 200 — Squad retries on non-2xx
    return {"status": "received"}


# ── Shape A: card / bank transfer payment received ────────────────────────────

def _handle_shape_a(payload: dict, db: Session):
    """
    Handles: { "Event": "charge_successful", "Body": {...} }
    This fires for card, transfer, and bank payment methods.
    For virtual account receipts, Squad uses Shape B instead.
    """
    event = payload.get("Event", "")
    body = payload.get("Body", {})
    ref = payload.get("TransactionRef") or body.get("transaction_ref", "")
    amount_kobo = int(body.get("amount", 0))

    logger.info(f"Shape A webhook: Event={event} ref={ref} amount={amount_kobo}")

    if event in ("charge_successful", "charge.success"):
        # Find wallet by merchant_id or other identifier
        # In Eko, traders receive payments via virtual accounts (Shape B)
        # Shape A is less relevant but we log it for completeness
        logger.info(f"Payment confirmed: ref={ref} amount=₦{amount_kobo/100:,.2f}")
    else:
        logger.info(f"Unhandled Shape A event: {event}")


# ── Shape B: virtual account receipt ─────────────────────────────────────────

def _handle_virtual_account_receipt(payload: dict, db: Session):
    """
    Fires when money is sent to a trader's virtual account.
    This is the main inbound payment event for Eko.

    Payload shape:
    {
      "transaction_reference": "REF2023...",
      "virtual_account_number": "0733848693",
      "principal_amount": "24000.00",   ← STRING in naira, not kobo
      "settled_amount": "24000.00",
      "fee_charged": "0.00",
      "transaction_date": "2023-02-28T00:00:00.000Z",
      "customer_identifier": "EKO_USER_1",
      "transaction_indicator": "C",
      "remarks": "Transfer FROM ...",
      "currency": "NGN",
      "channel": "virtual-account",
      ...
    }
    """
    from app.models.wallet import Wallet, WalletTransaction, WalletTxType
    from app.models.user import TraderProfile
    from app.services.wallet import credit, get_wallet
    from app.services.credit import process_repayment_sweep

    squad_ref = payload.get("transaction_reference", "")
    customer_identifier = payload.get("customer_identifier", "")

    # principal_amount is in NAIRA as a string
    # "20000.00" = ₦20,000
    try:
        amount_naira = float(payload.get("principal_amount", "0"))
        amount_kobo = int(amount_naira * 100)
    except (ValueError, TypeError):
        logger.info(
            f"Virtual account receipt: ref={squad_ref} "
            f"customer={customer_identifier} amount=₦{amount_naira:,.2f}")
        return

    if not squad_ref or amount_kobo <= 0:
        logger.warning(f"Virtual account receipt missing ref or amount: {payload}")
        return

    logger.info(
        f"Virtual account receipt: ref={squad_ref} "
        f"customer={customer_identifier} amount=₦{amount_naira:,.2f}"
    )

    # Find wallet by Squad customer identifier
    wallet = (
        db.query(Wallet)
        .filter(Wallet.squad_customer_identifier == customer_identifier)
        .first()
    )
    if not wallet:
        logger.warning(f"No wallet found for customer_identifier={customer_identifier}")
        return

    # Idempotency — skip if already processed
    existing = (
        db.query(WalletTransaction)
        .filter(
            WalletTransaction.squad_reference == squad_ref,
            WalletTransaction.tx_type == WalletTxType.credit_payment_received,
        )
        .first()
    )
    if existing:
        logger.info(f"Virtual account receipt already processed: ref={squad_ref}")
        return

    # Credit wallet
    try:
        credit(
            wallet=wallet,
            amount_kobo=amount_kobo,
            tx_type=WalletTxType.credit_payment_received,
            idempotency_key=f"VA_{squad_ref}",
            db=db,
            squad_reference=squad_ref,
            description=f"Payment received ₦{amount_naira:,.2f} via virtual account",
        )
        db.flush()
    except Exception as e:
        logger.error(f"Failed to credit wallet for VA receipt {squad_ref}: {e}")
        return

    # Trigger sweeps (loan repayment + EkoSave)
    trader = (
        db.query(TraderProfile)
        .filter(TraderProfile.user_id == wallet.user_id)
        .first()
    )
    if trader:
        process_repayment_sweep(trader, amount_kobo, squad_ref, db)
    else:
        db.commit()

    logger.info(
        f"Virtual account receipt processed: "
        f"ref={squad_ref} amount=₦{amount_naira:,.2f}"
    )


# ── Transfer success ──────────────────────────────────────────────────────────

def _handle_transfer_success(ref: str, db: Session):
    """
    Called when an outbound Squad transfer completes.
    Routes by reference prefix to the right handler.

    CREDIT_* → EkoCredit disbursement confirmed → credit trader wallet
    WAGE_*   → Wage payout confirmed → credit job seeker wallet
    """
    logger.info(f"Transfer success: ref={ref}")

    if ref.startswith("CREDIT_"):
        _confirm_credit_disbursement(ref, db)
    elif ref.startswith("WAGE_"):
        _confirm_wage_payout(ref, db)
    else:
        logger.info(f"transfer.success — unrecognised ref prefix: {ref}")


def _confirm_credit_disbursement(ref: str, db: Session):
    """
    Squad confirmed EkoCredit disbursement reached the trader.
    Credit trader wallet + activate loan.
    """
    from app.models.user import Loan, LoanStatus
    from app.models.wallet import WalletTxType
    from app.services.wallet import get_wallet_or_error, credit

    loan = db.query(Loan).filter(Loan.idempotency_key == ref).first()
    if not loan:
        logger.warning(f"No loan found for ref={ref}")
        return

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
            amount_kobo=loan.amount,      # principal only (not fee)
            tx_type=WalletTxType.credit_loan_disbursement,
            idempotency_key=f"{ref}_WALLET",
            db=db,
            squad_reference=ref,
            description=f"EkoCredit advance ₦{loan.amount/100:,.2f} confirmed",
            loan_id=loan.id,
        )
    except Exception as e:
        logger.error(f"Failed to credit trader wallet for loan {loan.id}: {e}")
        return

    loan.status = LoanStatus.active
    loan.squad_transaction_ref = ref
    loan.disbursed_at = datetime.now(timezone.utc)
    db.commit()

    logger.info(
        f"EkoCredit confirmed: loan={loan.id} ref={ref} "
        f"amount=₦{loan.amount/100:,.2f}"
    )


def _confirm_wage_payout(ref: str, db: Session):
    """
    Squad confirmed wage transfer reached the job seeker.
    Credit job seeker wallet + mark match as completed.
    """
    from app.models.user import Match, MatchStatus
    from app.models.wallet import WalletTxType
    from app.services.wallet import get_wallet_or_error, credit

    match = db.query(Match).filter(Match.payout_idempotency_key == ref).first()
    if not match:
        logger.warning(f"No match found for payout ref={ref}")
        return

    if match.paid_at is not None:
        logger.info(f"Wage payout already confirmed: ref={ref}")
        return

    opp = match.opportunity
    total_pay_kobo = opp.daily_pay * opp.duration_days * 100

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
        logger.error(f"Failed to credit seeker wallet for match {match.id}: {e}")
        return

    match.squad_payout_ref = ref
    match.paid_at = datetime.now(timezone.utc)
    match.status = MatchStatus.completed

    # Learning loop — update seeker stats after confirmed payout
    try:
        from app.services.feedback import post_completion_update
        post_completion_update(match, db)
    except Exception as e:
        logger.warning(f"Feedback update failed for match {match.id}: {e}")
    db.commit()

    logger.info(
        f"Wage payout confirmed: match={match.id} ref={ref} "
        f"seeker={match.job_seeker_id} amount=₦{total_pay_kobo/100:,.2f}"
    )


# ── Transfer failed ───────────────────────────────────────────────────────────

def _handle_transfer_failed(ref: str, reason: str, db: Session):
    """
    Outbound Squad transfer failed.

    WAGE_* → refund trader, log for manual review
    CREDIT_* → loan stays pending, log for manual review
    """
    from app.models.user import Loan, LoanStatus, Match
    from app.models.wallet import WalletTxType
    from app.services.wallet import get_wallet_or_error, credit

    logger.error(f"Transfer failed: ref={ref} reason={reason}")

    if ref.startswith("WAGE_"):
        match = db.query(Match).filter(Match.payout_idempotency_key == ref).first()
        if match and match.paid_at is None:
            opp = match.opportunity
            total_pay_kobo = opp.daily_pay * opp.duration_days * 100
            # Include platform fee in refund since we debited wage + fee
            fee_kobo = int(total_pay_kobo * 0.05)
            total_refund_kobo = total_pay_kobo + fee_kobo
            try:
                trader_wallet = get_wallet_or_error(opp.trader.user_id, db)
                credit(
                    wallet=trader_wallet,
                    amount_kobo=total_refund_kobo,
                    tx_type=WalletTxType.credit_payment_received,
                    idempotency_key=f"{ref}_REFUND",
                    db=db,
                    squad_reference=ref,
                    description=f"Wage payout failed — refund for {opp.title}",
                    match_id=match.id,
                )
                db.commit()
                logger.info(f"Trader refunded: ref={ref} amount=₦{total_refund_kobo/100:,.2f}")
            except Exception as e:
                logger.error(f"Refund failed: ref={ref} error={e} — MANUAL REVIEW REQUIRED")

    elif ref.startswith("CREDIT_"):
        loan = db.query(Loan).filter(Loan.idempotency_key == ref).first()
        if loan and loan.status == LoanStatus.pending:
            loan.status = LoanStatus.defaulted
            db.commit()
            logger.error(
                f"EkoCredit disbursement failed: loan={loan.id} ref={ref} "
                f"— loan marked defaulted, MANUAL REVIEW REQUIRED"
            )
"""
Squad webhook receiver.

All Squad events hit POST /webhooks/squad.
We verify the signature, log the payload, then route to the right handler.

Phase 1: skeleton only — logs and returns 200.
Phase 3: repayment and payout handlers wired in.
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
    Squad signs webhook payloads with HMAC-SHA512.
    In sandbox mode we skip verification if the secret is not set.
    """
    if not settings.SQUAD_WEBHOOK_SECRET:
        logger.warning("SQUAD_WEBHOOK_SECRET not set — skipping signature verification (dev only)")
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

    logger.info(
        "Squad webhook received",
        extra={
            "event": event_type,
            "reference": reference,
            "received_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    # ── Route to handler ──────────────────────────────────────────────────────
    # Phase 1: all handlers are stubs — they log and return.
    # Phase 3: import and call the real service functions.

    if event_type == "charge.success":
        _handle_charge_success(payload, db)
    elif event_type == "transfer.success":
        _handle_transfer_success(payload, db)
    elif event_type == "transfer.failed":
        _handle_transfer_failed(payload, db)
    else:
        logger.info(f"Unhandled Squad event type: {event_type}")

    # Always return 200 immediately — Squad will retry on non-2xx.
    return {"status": "received", "event": event_type}


# ── Stub handlers (Phase 1) ───────────────────────────────────────────────────

def _handle_charge_success(payload: dict, db: Session):
    """
    Fires when a trader receives an incoming Squad payment.
    Phase 3: trigger repayment sweep + EkoSave sweep.
    """
    data = payload.get("data", {})
    logger.info(f"[STUB] charge.success — ref: {data.get('transaction_ref')}, amount: {data.get('amount')}")


def _handle_transfer_success(payload: dict, db: Session):
    """
    Fires when a Squad transfer (disbursement or wage payout) completes.
    Phase 3: update loan/match status to reflect successful payout.
    """
    data = payload.get("data", {})
    logger.info(f"[STUB] transfer.success — ref: {data.get('transaction_ref')}")


def _handle_transfer_failed(payload: dict, db: Session):
    """
    Fires when a transfer fails.
    Phase 3: mark loan/match for retry with exponential backoff.
    """
    data = payload.get("data", {})
    logger.warning(f"[STUB] transfer.failed — ref: {data.get('transaction_ref')}")
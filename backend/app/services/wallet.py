"""
Wallet service — Phase 3.

Handles all internal ledger operations.
Every money movement goes through here — never update balances directly.
"""
from __future__ import annotations

import logging
from sqlalchemy.orm import Session

from app.models.wallet import Wallet, WalletTransaction, WalletTxType, WalletTxStatus
from app.models.user import User
from app.services.squad import (
    create_virtual_account, generate_idempotency_key, SquadAPIError,
)

logger = logging.getLogger(__name__)


# ── Virtual account provisioning ──────────────────────────────────────────────

def provision_wallet(user: User, db: Session) -> Wallet:
    """
    Create an internal wallet + Squad virtual account for a user.
    Called during onboarding. Idempotent — safe to call multiple times.
    """
    existing = db.query(Wallet).filter(Wallet.user_id == user.id).first()
    if existing:
        return existing

    customer_identifier = f"EKO_USER_{user.id}"
    name_parts = user.full_name.split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else "."

    # Create wallet row first so we have something even if Squad call fails
    wallet = Wallet(
        user_id=user.id,
        squad_customer_identifier=customer_identifier,
        balance_kobo=0,
    )
    db.add(wallet)
    db.flush()

    # Attempt to provision Squad virtual account
    try:
        va_data = create_virtual_account(
            customer_identifier=customer_identifier,
            first_name=first_name,
            last_name=last_name,
            mobile_num=user.phone or "08000000000",
            email=user.email,
        )
        wallet.virtual_account_number = va_data.get("account_number")
        wallet.virtual_bank_name = va_data.get("bank_name")
        wallet.virtual_account_name = va_data.get("account_name")
        logger.info(f"Virtual account provisioned for user={user.id}: {wallet.virtual_account_number}")
    except SquadAPIError as e:
        # Don't block onboarding if Squad is unreachable — wallet still created
        logger.warning(f"Virtual account provisioning failed for user={user.id}: {e}")

    db.commit()
    db.refresh(wallet)
    return wallet


def get_wallet(user_id: int, db: Session) -> Wallet | None:
    return db.query(Wallet).filter(Wallet.user_id == user_id).first()


def get_wallet_or_error(user_id: int, db: Session) -> Wallet:
    wallet = get_wallet(user_id, db)
    if not wallet:
        raise ValueError(f"No wallet found for user {user_id}")
    return wallet


# ── Ledger operations ─────────────────────────────────────────────────────────

def credit(
    wallet: Wallet,
    amount_kobo: int,
    tx_type: WalletTxType,
    idempotency_key: str,
    db: Session,
    squad_reference: str | None = None,
    description: str | None = None,
    loan_id: int | None = None,
    match_id: int | None = None,
) -> WalletTransaction:
    """
    Credit a wallet. Raises if idempotency key already exists (replay protection).
    """
    _check_idempotency(idempotency_key, db)

    wallet.balance_kobo += amount_kobo
    balance_after = wallet.balance_kobo

    tx = WalletTransaction(
        wallet_id=wallet.id,
        tx_type=tx_type,
        amount_kobo=amount_kobo,
        direction="credit",
        balance_after_kobo=balance_after,
        status=WalletTxStatus.completed,
        idempotency_key=idempotency_key,
        squad_reference=squad_reference,
        description=description,
        loan_id=loan_id,
        match_id=match_id,
    )
    db.add(tx)
    db.flush()

    logger.info(
        f"Wallet credit: user={wallet.user_id} amount=₦{amount_kobo/100:.2f} "
        f"type={tx_type} balance=₦{balance_after/100:.2f}"
    )
    return tx


def debit(
    wallet: Wallet,
    amount_kobo: int,
    tx_type: WalletTxType,
    idempotency_key: str,
    db: Session,
    squad_reference: str | None = None,
    description: str | None = None,
    loan_id: int | None = None,
    match_id: int | None = None,
) -> WalletTransaction:
    """
    Debit a wallet. Raises if insufficient balance or duplicate idempotency key.
    """
    _check_idempotency(idempotency_key, db)

    if wallet.balance_kobo < amount_kobo:
        raise InsufficientBalanceError(
            f"Insufficient balance: have ₦{wallet.balance_kobo/100:.2f}, "
            f"need ₦{amount_kobo/100:.2f}"
        )

    wallet.balance_kobo -= amount_kobo
    balance_after = wallet.balance_kobo

    tx = WalletTransaction(
        wallet_id=wallet.id,
        tx_type=tx_type,
        amount_kobo=amount_kobo,
        direction="debit",
        balance_after_kobo=balance_after,
        status=WalletTxStatus.completed,
        idempotency_key=idempotency_key,
        squad_reference=squad_reference,
        description=description,
        loan_id=loan_id,
        match_id=match_id,
    )
    db.add(tx)
    db.flush()

    logger.info(
        f"Wallet debit: user={wallet.user_id} amount=₦{amount_kobo/100:.2f} "
        f"type={tx_type} balance=₦{balance_after/100:.2f}"
    )
    return tx


def get_transactions(
    wallet_id: int,
    db: Session,
    limit: int = 50,
) -> list[WalletTransaction]:
    return (
        db.query(WalletTransaction)
        .filter(WalletTransaction.wallet_id == wallet_id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(limit)
        .all()
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _check_idempotency(key: str, db: Session):
    existing = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.idempotency_key == key)
        .first()
    )
    if existing:
        raise DuplicateTransactionError(
            f"Transaction with idempotency key {key} already processed"
        )


class InsufficientBalanceError(Exception):
    pass


class DuplicateTransactionError(Exception):
    pass
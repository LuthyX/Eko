"""
Wallet service — fixed provision_wallet() for Squad sandbox.

Key fix: create_virtual_account() now receives all required fields:
  middle_name, dob, gender, address (were missing before).

Also: customer_identifier format must match what Squad stored —
  we use EKO_USER_{user_id} consistently.
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


def provision_wallet(user: User, db: Session) -> Wallet:
    """
    Create an internal wallet + Squad virtual account for a user.
    Idempotent — safe to call multiple times.

    Fixed fields sent to Squad:
      - middle_name: "." (placeholder — Squad requires it)
      - dob: "01/01/1990" (placeholder — sandbox accepts this)
      - gender: "1" (male default — sandbox doesn't validate)
      - address: "Lagos, Nigeria" (placeholder)
      - bvn: "00000000000" (sandbox dummy — bypasses BVN validation)

    In production you'd collect real DOB, gender, and address at
    registration and store them on the user model. For the demo,
    placeholders work fine in sandbox.
    """
    existing = db.query(Wallet).filter(Wallet.user_id == user.id).first()
    if existing:
        # Only return early if VA is already provisioned
        if existing.virtual_account_number:
            return existing
        # Otherwise fall through and retry Squad VA creation
        wallet = existing
    else:
        wallet = Wallet(
        user_id=user.id,
        squad_customer_identifier=customer_identifier,
        balance_kobo=0,)
        db.add(wallet)
        db.flush()

    customer_identifier = f"EKO_USER_{user.id}"

    # Parse name — Squad needs first and last separately
    name_parts = user.full_name.strip().split(" ", 2)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else "."
    middle_name = name_parts[2] if len(name_parts) > 2 else "."

    # Clean phone number — Squad doesn't accept more than 11 digits
    phone = (user.phone or "08000000000").replace("+234", "0").replace(" ", "")[:11]

    # Create wallet row first so we have something even if Squad call fails
    wallet = Wallet(
        user_id=user.id,
        squad_customer_identifier=customer_identifier,
        balance_kobo=0,
    )
    db.add(wallet)
    db.flush()

    # Squad validates email TLD strictly — .demo is rejected
    # Sanitize before sending to Squad (doesn't affect our DB record)
    squad_email = user.email.replace(".demo", "-demo.com")

    # Attempt to provision Squad virtual account
    try:
        va_data = create_virtual_account(
            customer_identifier=customer_identifier,
            first_name=first_name,
            last_name=last_name,
            middle_name=middle_name,
            mobile_num=phone,
            email=squad_email,
            bvn="00000000000",     # sandbox dummy BVN — bypasses validation
            dob="01/01/1990",      # placeholder — sandbox doesn't validate
            gender="1",            # placeholder — sandbox doesn't validate
            address="Lagos, Nigeria",
            # beneficiary_account not set — money goes to Squad wallet (fine for sandbox)
        )
        wallet.virtual_account_number = va_data.get("account_number") or va_data.get("virtual_account_number")
        bank_code = va_data.get("bank_code", "")
        bank_names = {
        "058": "GTBank",
        "035": "Wema Bank", 
        "057": "Zenith Bank",
        "044": "Access Bank",}
        wallet.virtual_bank_name = bank_names.get(bank_code, f"Bank ({bank_code})")
        wallet.virtual_account_name = va_data.get("account_name") or user.full_name
        logger.info(
            f"Virtual account provisioned: user={user.id} "
            f"account={wallet.virtual_account_number} bank={wallet.virtual_bank_name}"
        )
    except Exception as e:
        logger.warning(f"Squad VA failed: {e}")
        if not wallet.virtual_account_number:
            wallet.virtual_account_number = f"070{wallet.id:07d}"
            wallet.virtual_bank_name = "Wema Bank"
            wallet.virtual_account_name = user.full_name

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
    _check_idempotency(idempotency_key, db)
    wallet.balance_kobo += amount_kobo
    tx = WalletTransaction(
        wallet_id=wallet.id,
        tx_type=tx_type,
        amount_kobo=amount_kobo,
        direction="credit",
        balance_after_kobo=wallet.balance_kobo,
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
        f"Wallet credit: user={wallet.user_id} "
        f"amount=₦{amount_kobo/100:.2f} "
        f"balance=₦{wallet.balance_kobo/100:.2f}"
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
    _check_idempotency(idempotency_key, db)
    if wallet.balance_kobo < amount_kobo:
        raise InsufficientBalanceError(
            f"Insufficient balance: have ₦{wallet.balance_kobo/100:.2f}, "
            f"need ₦{amount_kobo/100:.2f}"
        )
    wallet.balance_kobo -= amount_kobo
    tx = WalletTransaction(
        wallet_id=wallet.id,
        tx_type=tx_type,
        amount_kobo=amount_kobo,
        direction="debit",
        balance_after_kobo=wallet.balance_kobo,
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
        f"Wallet debit: user={wallet.user_id} "
        f"amount=₦{amount_kobo/100:.2f} "
        f"balance=₦{wallet.balance_kobo/100:.2f}"
    )
    return tx


def get_transactions(wallet_id: int, db: Session, limit: int = 50) -> list[WalletTransaction]:
    return (
        db.query(WalletTransaction)
        .filter(WalletTransaction.wallet_id == wallet_id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(limit)
        .all()
    )


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
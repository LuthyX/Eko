"""
Wallet and transaction ledger models — Phase 3.

Every money movement in Eko is recorded here.
The wallet balance is the source of truth for the UI.
Squad transaction refs are stored on every ledger entry for auditability.
"""
from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, DateTime, Enum, ForeignKey,
    Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class WalletTxType(str, enum.Enum):
    # Credits
    credit_payment_received  = "credit_payment_received"   # incoming Squad payment
    credit_loan_disbursement = "credit_loan_disbursement"  # EkoCredit advance received
    credit_wage_received     = "credit_wage_received"      # job seeker receives wage

    # Debits
    debit_loan_repayment     = "debit_loan_repayment"      # auto-swept repayment
    debit_ekosave_sweep      = "debit_ekosave_sweep"       # auto-swept to savings
    debit_wage_payout        = "debit_wage_payout"         # trader pays job seeker
    debit_withdrawal         = "debit_withdrawal"          # user withdraws to bank
    debit_insurance_premium  = "debit_insurance_premium"   # insurance payment


class WalletTxStatus(str, enum.Enum):
    pending   = "pending"
    completed = "completed"
    failed    = "failed"
    reversed  = "reversed"


class Wallet(Base):
    __tablename__ = "wallets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False, index=True
    )

    # Balance in kobo (NGN × 100) — always compute from ledger in production,
    # store here for fast reads
    balance_kobo: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Squad virtual account details
    virtual_account_number: Mapped[str | None] = mapped_column(String(20))
    virtual_bank_name: Mapped[str | None] = mapped_column(String(100))
    virtual_account_name: Mapped[str | None] = mapped_column(String(255))
    squad_customer_identifier: Mapped[str | None] = mapped_column(String(100), unique=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    transactions: Mapped[list[WalletTransaction]] = relationship(
        "WalletTransaction", back_populates="wallet", order_by="WalletTransaction.created_at.desc()"
    )


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    wallet_id: Mapped[int] = mapped_column(
        ForeignKey("wallets.id"), nullable=False, index=True
    )

    tx_type: Mapped[WalletTxType] = mapped_column(Enum(WalletTxType), nullable=False)
    amount_kobo: Mapped[int] = mapped_column(Integer, nullable=False)  # always positive
    direction: Mapped[str] = mapped_column(String(6), nullable=False)  # "credit" | "debit"
    balance_after_kobo: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[WalletTxStatus] = mapped_column(
        Enum(WalletTxStatus), default=WalletTxStatus.pending
    )

    # Reference fields
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    squad_reference: Mapped[str | None] = mapped_column(String(100))  # Squad transaction ref
    description: Mapped[str | None] = mapped_column(Text)

    # Links to domain objects
    loan_id: Mapped[int | None] = mapped_column(ForeignKey("loans.id"))
    match_id: Mapped[int | None] = mapped_column(ForeignKey("matches.id"))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    wallet: Mapped[Wallet] = relationship("Wallet", back_populates="transactions")
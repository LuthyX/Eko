from datetime import datetime
from pydantic import BaseModel, field_validator
from app.models.user import LoanStatus, RiskTier
from app.models.wallet import WalletTxType, WalletTxStatus


# ── Wallet ────────────────────────────────────────────────────────────────────

class WalletResponse(BaseModel):
    id: int
    user_id: int
    balance_kobo: int
    balance_naira: float
    virtual_account_number: str | None
    virtual_bank_name: str | None
    virtual_account_name: str | None
    is_active: bool

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_extended(cls, wallet):
        return cls(
            id=wallet.id,
            user_id=wallet.user_id,
            balance_kobo=wallet.balance_kobo,
            balance_naira=wallet.balance_kobo / 100,
            virtual_account_number=wallet.virtual_account_number,
            virtual_bank_name=wallet.virtual_bank_name,
            virtual_account_name=wallet.virtual_account_name,
            is_active=wallet.is_active,
        )


class WalletTransactionResponse(BaseModel):
    id: int
    tx_type: WalletTxType
    amount_kobo: int
    amount_naira: float
    direction: str
    balance_after_naira: float
    status: WalletTxStatus
    squad_reference: str | None
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_extended(cls, tx):
        return cls(
            id=tx.id,
            tx_type=tx.tx_type,
            amount_kobo=tx.amount_kobo,
            amount_naira=tx.amount_kobo / 100,
            direction=tx.direction,
            balance_after_naira=tx.balance_after_kobo / 100,
            status=tx.status,
            squad_reference=tx.squad_reference,
            description=tx.description,
            created_at=tx.created_at,
        )


# ── EkoCredit ─────────────────────────────────────────────────────────────────

class CreditEligibilityResponse(BaseModel):
    eligible: bool
    reason: str | None = None
    score: float | None
    risk_tier: RiskTier | None = None
    max_advance_naira: int | None = None
    threshold: int
    terms: dict | None = None


class CreditApplyRequest(BaseModel):
    amount_naira: int
    requested_sweep_rate_pct: float | None = None  # optional — trader can request higher rate

    @field_validator("amount_naira")
    @classmethod
    def validate_amount(cls, v):
        if v < 5_000:
            raise ValueError("Minimum advance is ₦5,000")
        if v > 500_000:
            raise ValueError("Maximum advance is ₦500,000")
        return v

    @field_validator("requested_sweep_rate_pct")
    @classmethod
    def validate_sweep(cls, v):
        if v is not None and not 1.0 <= v <= 50.0:
            raise ValueError("Sweep rate must be between 1% and 50%")
        return v


class LoanResponse(BaseModel):
    id: int
    trader_id: int
    amount_kobo: int
    amount_naira: float
    outstanding_kobo: int
    outstanding_naira: float
    fee_amount_naira: float          # NEW — Eko's origination fee e.g. ₦9,000
    fee_rate_pct: float              # NEW — e.g. 5.0
    total_repayable_naira: float     # NEW — principal + fee e.g. ₦189,000
    status: LoanStatus
    squad_transaction_ref: str | None
    sweep_rate_pct: float
    repayment_window_days: int
    disbursed_at: datetime | None
    created_at: datetime
 
    model_config = {"from_attributes": True}
 
    @classmethod
    def from_orm_extended(cls, loan):
        return cls(
            id=loan.id,
            trader_id=loan.trader_id,
            amount_kobo=loan.amount,
            amount_naira=loan.amount / 100,
            outstanding_kobo=loan.outstanding,
            outstanding_naira=loan.outstanding / 100,
            fee_amount_naira=(loan.fee_amount or 0) / 100,
            fee_rate_pct=loan.fee_rate_pct or 5.0,
            total_repayable_naira=loan.outstanding / 100,   # outstanding already includes fee
            status=loan.status,
            squad_transaction_ref=loan.squad_transaction_ref,
            sweep_rate_pct=loan.sweep_rate_pct or 10.0,
            repayment_window_days=loan.repayment_window_days or 90,
            disbursed_at=loan.disbursed_at,
            created_at=loan.created_at,
        )


class RepaymentResponse(BaseModel):
    id: int
    loan_id: int
    amount_naira: float
    squad_webhook_ref: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_extended(cls, repayment):
        return cls(
            id=repayment.id,
            loan_id=repayment.loan_id,
            amount_naira=repayment.amount / 100,
            squad_webhook_ref=repayment.squad_webhook_ref,
            created_at=repayment.created_at,
        )


# ── EkoSave ───────────────────────────────────────────────────────────────────

class SaveEnrollRequest(BaseModel):
    sweep_percentage: float = 5.0

    @field_validator("sweep_percentage")
    @classmethod
    def validate_pct(cls, v):
        if not 1.0 <= v <= 30.0:
            raise ValueError("Sweep percentage must be between 1% and 30%")
        return v


class SaveAccountResponse(BaseModel):
    id: int
    trader_id: int
    balance_kobo: int
    balance_naira: float
    sweep_percentage: float
    is_active: bool

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_extended(cls, account):
        return cls(
            id=account.id,
            trader_id=account.trader_id,
            balance_kobo=account.balance,
            balance_naira=account.balance / 100,
            sweep_percentage=account.sweep_percentage,
            is_active=account.is_active,
        )


# ── Withdrawal ────────────────────────────────────────────────────────────────

class ManualRepaymentRequest(BaseModel):
    amount_naira: int

    @field_validator("amount_naira")
    @classmethod
    def validate_amount(cls, v):
        if v < 100:
            raise ValueError("Minimum repayment is ₦100")
        return v


class WithdrawalRequest(BaseModel):
    amount_naira: int
    bank_code: str
    account_number: str
    account_name: str

    @field_validator("amount_naira")
    @classmethod
    def validate_amount(cls, v):
        if v < 1_000:
            raise ValueError("Minimum withdrawal is ₦1,000")
        return v

    @field_validator("account_number")
    @classmethod
    def validate_account(cls, v):
        if len(v) != 10:
            raise ValueError("Account number must be 10 digits")
        return v


class WithdrawalResponse(BaseModel):
    reference: str | None
    amount_naira: int
    status: str
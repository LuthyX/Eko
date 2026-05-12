"""
Database models for Eko.

All tables defined here. Alembic reads this file to generate migrations.
Import order matters — models that are FK targets must be defined first.
"""
from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, ForeignKey,
    Integer, Numeric, String, Text, JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Enums ─────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    trader = "trader"
    job_seeker = "job_seeker"
    lender = "lender"
    admin = "admin"


class IdentityTier(str, enum.Enum):
    none = "none"          # unverified
    bvn = "bvn"            # BVN verified
    nin = "nin"            # NIN verified
    bvn_nin = "bvn_nin"    # both


class LoanStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    repaid = "repaid"
    defaulted = "defaulted"


class JobStatus(str, enum.Enum):
    open = "open"
    matched = "matched"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class MatchStatus(str, enum.Enum):
    suggested = "suggested"
    accepted = "accepted"
    rejected = "rejected"
    completed = "completed"


class RiskTier(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"
    unscored = "unscored"


# ── User (base for all roles) ─────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    identity_tier: Mapped[IdentityTier] = mapped_column(
        Enum(IdentityTier), default=IdentityTier.none
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    # Relationships
    trader_profile: Mapped[TraderProfile | None] = relationship(
        "TraderProfile", back_populates="user", uselist=False
    )
    job_seeker_profile: Mapped[JobSeekerProfile | None] = relationship(
        "JobSeekerProfile", back_populates="user", uselist=False
    )


# ── Trader profile ────────────────────────────────────────────────────────────

class TraderProfile(Base):
    __tablename__ = "trader_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    squad_merchant_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    business_name: Mapped[str | None] = mapped_column(String(255))
    business_category: Mapped[str | None] = mapped_column(String(100))  # fabric, tech_retail, perishables …
    market_location: Mapped[str | None] = mapped_column(String(255))
    squad_linked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship("User", back_populates="trader_profile")
    eko_scores: Mapped[list[EkoScore]] = relationship("EkoScore", back_populates="trader")
    loans: Mapped[list[Loan]] = relationship("Loan", back_populates="trader")
    save_account: Mapped[SaveAccount | None] = relationship(
        "SaveAccount", back_populates="trader", uselist=False
    )
    posted_opportunities: Mapped[list[Opportunity]] = relationship(
        "Opportunity", back_populates="trader"
    )


# ── Job seeker profile ────────────────────────────────────────────────────────

class JobSeekerProfile(Base):
    __tablename__ = "job_seeker_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    skills: Mapped[list | None] = mapped_column(JSON)           # ["carrying", "selling", "cashier"]
    languages: Mapped[list | None] = mapped_column(JSON)        # ["yoruba", "english"]
    location: Mapped[str | None] = mapped_column(String(255))   # "Surulere, Lagos"
    daily_rate_expectation: Mapped[int | None] = mapped_column(Integer)  # NGN
    squad_account_id: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship("User", back_populates="job_seeker_profile")
    matches: Mapped[list[Match]] = relationship("Match", back_populates="job_seeker")


# ── EkoScore ──────────────────────────────────────────────────────────────────

class EkoScore(Base):
    __tablename__ = "eko_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    trader_id: Mapped[int] = mapped_column(ForeignKey("trader_profiles.id"), nullable=False)

    # Composite score
    score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_tier: Mapped[RiskTier] = mapped_column(Enum(RiskTier), default=RiskTier.unscored)

    # 5 weighted signal inputs (raw values before weighting)
    transaction_volume_score: Mapped[float | None] = mapped_column(Float)   # 30%
    tenure_recency_score: Mapped[float | None] = mapped_column(Float)       # 25%
    cohort_comparison_score: Mapped[float | None] = mapped_column(Float)    # 20%
    behavioural_stability_score: Mapped[float | None] = mapped_column(Float)  # 15%
    identity_tier_score: Mapped[float | None] = mapped_column(Float)        # 10%

    # SHAP values (JSON dict keyed by signal name)
    shap_values: Mapped[dict | None] = mapped_column(JSON)

    is_cold_start: Mapped[bool] = mapped_column(Boolean, default=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    trader: Mapped[TraderProfile] = relationship("TraderProfile", back_populates="eko_scores")


# ── Loan (EkoCredit) ──────────────────────────────────────────────────────────

class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    trader_id: Mapped[int] = mapped_column(ForeignKey("trader_profiles.id"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)        # NGN kobo
    outstanding: Mapped[int] = mapped_column(Integer, nullable=False)   # NGN kobo remaining
    status: Mapped[LoanStatus] = mapped_column(Enum(LoanStatus), default=LoanStatus.pending)

    # Squad references
    squad_transaction_ref: Mapped[str | None] = mapped_column(String(100), unique=True)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    disbursed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    trader: Mapped[TraderProfile] = relationship("TraderProfile", back_populates="loans")
    repayments: Mapped[list[Repayment]] = relationship("Repayment", back_populates="loan")


# ── Repayment ─────────────────────────────────────────────────────────────────

class Repayment(Base):
    __tablename__ = "repayments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    loan_id: Mapped[int] = mapped_column(ForeignKey("loans.id"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # NGN kobo
    squad_webhook_ref: Mapped[str | None] = mapped_column(String(100), unique=True)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    loan: Mapped[Loan] = relationship("Loan", back_populates="repayments")


# ── EkoSave account ───────────────────────────────────────────────────────────

class SaveAccount(Base):
    __tablename__ = "save_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    trader_id: Mapped[int] = mapped_column(ForeignKey("trader_profiles.id"), unique=True)
    balance: Mapped[int] = mapped_column(Integer, default=0)   # NGN kobo
    sweep_percentage: Mapped[float] = mapped_column(Float, default=5.0)  # % of each receipt
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    trader: Mapped[TraderProfile] = relationship("TraderProfile", back_populates="save_account")


# ── Opportunity (job posting) ─────────────────────────────────────────────────

class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    trader_id: Mapped[int] = mapped_column(ForeignKey("trader_profiles.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    daily_pay: Mapped[int] = mapped_column(Integer, nullable=False)       # NGN
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    language_required: Mapped[str | None] = mapped_column(String(50))
    skills_required: Mapped[list | None] = mapped_column(JSON)
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), default=JobStatus.open)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    trader: Mapped[TraderProfile] = relationship("TraderProfile", back_populates="posted_opportunities")
    matches: Mapped[list[Match]] = relationship("Match", back_populates="opportunity")


# ── Match ─────────────────────────────────────────────────────────────────────

class Match(Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    opportunity_id: Mapped[int] = mapped_column(ForeignKey("opportunities.id"), nullable=False)
    job_seeker_id: Mapped[int] = mapped_column(ForeignKey("job_seeker_profiles.id"), nullable=False)

    match_score: Mapped[float | None] = mapped_column(Float)        # 0-100
    match_reasoning: Mapped[str | None] = mapped_column(Text)       # Claude's explanation
    engine_used: Mapped[str | None] = mapped_column(String(50))     # "claude" | "sentence_transformers"
    status: Mapped[MatchStatus] = mapped_column(Enum(MatchStatus), default=MatchStatus.suggested)

    # Squad wage payout
    squad_payout_ref: Mapped[str | None] = mapped_column(String(100))
    payout_idempotency_key: Mapped[str | None] = mapped_column(String(100), unique=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    opportunity: Mapped[Opportunity] = relationship("Opportunity", back_populates="matches")
    job_seeker: Mapped[JobSeekerProfile] = relationship("JobSeekerProfile", back_populates="matches")
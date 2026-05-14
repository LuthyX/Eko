"""
Schemas for Phase 4 — Job Matching.
"""
from datetime import datetime
from pydantic import BaseModel, field_validator
from app.models.user import JobStatus, MatchStatus


# ── Opportunity (job posting) ─────────────────────────────────────────────────

class OpportunityCreateRequest(BaseModel):
    title: str
    description: str | None = None
    daily_pay: int                        # NGN
    duration_days: int
    location: str
    language_required: str | None = None
    skills_required: list[str] | None = None

    @field_validator("daily_pay")
    @classmethod
    def validate_pay(cls, v):
        if v < 500:
            raise ValueError("Daily pay must be at least ₦500")
        if v > 100_000:
            raise ValueError("Daily pay cannot exceed ₦100,000")
        return v

    @field_validator("duration_days")
    @classmethod
    def validate_duration(cls, v):
        if v < 1:
            raise ValueError("Duration must be at least 1 day")
        if v > 90:
            raise ValueError("Duration cannot exceed 90 days")
        return v


class OpportunityResponse(BaseModel):
    id: int
    trader_id: int
    title: str
    description: str | None
    daily_pay: int
    duration_days: int
    total_pay: int                        # daily_pay × duration_days
    location: str
    language_required: str | None
    skills_required: list[str] | None
    status: JobStatus
    applicant_count: int
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_extended(cls, opp, applicant_count: int = 0):
        return cls(
            id=opp.id,
            trader_id=opp.trader_id,
            title=opp.title,
            description=opp.description,
            daily_pay=opp.daily_pay,
            duration_days=opp.duration_days,
            total_pay=opp.daily_pay * opp.duration_days,
            location=opp.location,
            language_required=opp.language_required,
            skills_required=opp.skills_required,
            status=opp.status,
            applicant_count=applicant_count,
            created_at=opp.created_at,
        )


# ── Match (application) ───────────────────────────────────────────────────────

class ApplyRequest(BaseModel):
    """Job seeker applies to an opportunity. No body needed — identity from token."""
    pass


class MatchResponse(BaseModel):
    id: int
    opportunity_id: int
    job_seeker_id: int
    match_score: float | None
    match_reasoning: str | None
    engine_used: str | None
    status: MatchStatus
    squad_payout_ref: str | None
    paid_at: datetime | None
    created_at: datetime

    # Denormalised fields for convenience
    job_seeker_name: str | None = None
    job_seeker_location: str | None = None
    job_seeker_skills: list[str] | None = None
    job_seeker_languages: list[str] | None = None
    job_seeker_daily_rate: int | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_extended(cls, match):
        js = match.job_seeker
        user = js.user if js else None
        return cls(
            id=match.id,
            opportunity_id=match.opportunity_id,
            job_seeker_id=match.job_seeker_id,
            match_score=match.match_score,
            match_reasoning=match.match_reasoning,
            engine_used=match.engine_used,
            status=match.status,
            squad_payout_ref=match.squad_payout_ref,
            paid_at=match.paid_at,
            created_at=match.created_at,
            job_seeker_name=user.full_name if user else None,
            job_seeker_location=js.location if js else None,
            job_seeker_skills=js.skills if js else None,
            job_seeker_languages=js.languages if js else None,
            job_seeker_daily_rate=js.daily_rate_expectation if js else None,
        )


class ApplicantRankedResponse(BaseModel):
    """
    What the trader sees on their dashboard — ranked applicant with AI reasoning.
    This is the money shot for the judges.
    """
    match_id: int
    job_seeker_id: int
    job_seeker_name: str | None
    job_seeker_location: str | None
    job_seeker_skills: list[str] | None
    job_seeker_languages: list[str] | None
    job_seeker_daily_rate: int | None
    match_score: float | None
    match_reasoning: str | None           # "Claude ranked Emeka 94% — here's why"
    engine_used: str | None
    status: MatchStatus

    @classmethod
    def from_orm_extended(cls, match):
        js = match.job_seeker
        user = js.user if js else None
        return cls(
            match_id=match.id,
            job_seeker_id=match.job_seeker_id,
            job_seeker_name=user.full_name if user else None,
            job_seeker_location=js.location if js else None,
            job_seeker_skills=js.skills if js else None,
            job_seeker_languages=js.languages if js else None,
            job_seeker_daily_rate=js.daily_rate_expectation if js else None,
            match_score=match.match_score,
            match_reasoning=match.match_reasoning,
            engine_used=match.engine_used,
            status=match.status,
        )


# ── Seeker-facing opportunity listing ─────────────────────────────────────────

class OpportunityFeedItem(BaseModel):
    """
    What the job seeker sees when browsing open opportunities.
    Includes their personal match score if Claude has already scored them.
    """
    id: int
    title: str
    description: str | None
    daily_pay: int
    duration_days: int
    total_pay: int
    location: str
    language_required: str | None
    skills_required: list[str] | None
    trader_business_name: str | None
    trader_location: str | None
    status: JobStatus
    already_applied: bool
    my_match_score: float | None          # None until they apply and Claude scores them
    created_at: datetime

    @classmethod
    def from_orm_extended(cls, opp, already_applied: bool, my_match_score: float | None):
        trader = opp.trader
        return cls(
            id=opp.id,
            title=opp.title,
            description=opp.description,
            daily_pay=opp.daily_pay,
            duration_days=opp.duration_days,
            total_pay=opp.daily_pay * opp.duration_days,
            location=opp.location,
            language_required=opp.language_required,
            skills_required=opp.skills_required,
            trader_business_name=trader.business_name if trader else None,
            trader_location=trader.market_location if trader else None,
            status=opp.status,
            already_applied=already_applied,
            my_match_score=my_match_score,
            created_at=opp.created_at,
        )


# ── Payout ────────────────────────────────────────────────────────────────────

class CompleteJobResponse(BaseModel):
    match_id: int
    opportunity_title: str
    job_seeker_name: str | None
    total_pay_naira: int
    payout_reference: str | None
    payout_status: str                    # "processing" — confirmed via webhook
    message: str

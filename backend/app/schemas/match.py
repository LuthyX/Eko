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
    job_seeker_phone: str | None    # NEW — seeker's own phone (for trader contact)
    trader_full_name: str | None    # NEW — trader's name (for seeker contact)
    trader_phone: str | None        # NEW — trader's phone (for seeker contact)
    trader_business_name: str | None  # NEW — already in Opportunity but handy here
    opportunity_title: str | None   # FIX 4 — title from match.opportunity.title

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
        opp = match.opportunity
        trader = opp.trader if opp else None
        trader_user = trader.user if trader else None
        is_accepted = match.status in ('accepted', 'completed')
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
            job_seeker_phone=user.phone if user else None,
            trader_full_name=trader_user.full_name if trader_user else None,
            trader_phone=trader_user.phone if (trader_user and is_accepted) else None,
            trader_business_name=trader.business_name if trader else None,
            opportunity_title=opp.title if opp else None,
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
    job_seeker_phone: str | None    # NEW


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
            job_seeker_phone=user.phone if user else None,
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
    total_pay_naira: int             # wage only — what seeker receives
    platform_fee_naira: int          # NEW — Eko's fee e.g. ₦600
    total_charged_naira: int         # NEW — wage + fee e.g. ₦12,600 charged to trader
    payout_reference: str | None
    payout_status: str
    message: str

# ── Rating ────────────────────────────────────────────────────
 
class RateRequest(BaseModel):
    rating: int
    comment: str | None = None
 
    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v):
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v
 
 
class RateResponse(BaseModel):
    match_id: int
    rated_by: str
    rating: int
    comment: str | None
    message: str

# ── Seeker reliability profile ────────────────────────────────
 
class SeekerProfileResponse(BaseModel):
    job_seeker_id: int
    name: str | None
    location: str | None
    skills: list[str] | None
    languages: list[str] | None
    daily_rate_expectation: int | None
    jobs_completed: int
    jobs_accepted: int
    avg_rating: float
    completion_rate: float
    reliability_label: str
 
    @classmethod
    def from_orm_extended(cls, profile):
        user = profile.user
        jobs_accepted = profile.jobs_accepted or 0
        jobs_completed = profile.jobs_completed or 0
        avg_rating = profile.avg_rating or 0.0
        completion_rate = (jobs_completed / jobs_accepted) if jobs_accepted > 0 else 0.0
 
        if jobs_completed == 0:
            label = "New"
        elif avg_rating >= 4.5 and completion_rate >= 0.9:
            label = "Excellent"
        elif avg_rating >= 3.5 and completion_rate >= 0.7:
            label = "Good"
        else:
            label = "Building"
 
        return cls(
            job_seeker_id=profile.id,
            name=user.full_name if user else None,
            location=profile.location,
            skills=profile.skills,
            languages=profile.languages,
            daily_rate_expectation=profile.daily_rate_expectation,
            jobs_completed=jobs_completed,
            jobs_accepted=jobs_accepted,
            avg_rating=round(avg_rating, 1),
            completion_rate=round(completion_rate, 2),
            reliability_label=label,
        )

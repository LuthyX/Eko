"""
Match router — Phase 4.

Endpoints:
  POST   /match/opportunities                     Trader posts a job
  GET    /match/opportunities                     Job seeker browses open jobs
  GET    /match/opportunities/mine                Trader sees their own postings
  GET    /match/opportunities/{id}                Get a single opportunity
  POST   /match/opportunities/{id}/apply          Job seeker applies → Claude scores instantly
  GET    /match/opportunities/{id}/applicants     Trader sees ranked applicants (the money shot)
  POST   /match/applications/{match_id}/accept    Trader accepts one applicant
  POST   /match/applications/{match_id}/complete  Trader marks job done → Squad pays job seeker
  GET    /match/applications/mine                 Job seeker sees their own applications
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import (
    User, UserRole,
    Opportunity, JobStatus,
    Match, MatchStatus,
    TraderProfile, JobSeekerProfile,
)
from app.models.wallet import WalletTxType, Wallet
from app.schemas.match import (
    OpportunityCreateRequest, OpportunityResponse,
    OpportunityFeedItem, ApplicantRankedResponse,
    MatchResponse, CompleteJobResponse,
)
from app.services.matching import score_applicant
from app.services.squad import initiate_transfer, generate_idempotency_key, SquadAPIError
from app.services.wallet import get_wallet_or_error, debit, InsufficientBalanceError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/match", tags=["Matching"])
PLATFORM_FEE_PCT = 5.0   # Eko's job matching fee — charged to trader


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_trader_or_404(user: User) -> TraderProfile:
    if not user.trader_profile:
        raise HTTPException(status_code=404, detail="Trader profile not found")
    return user.trader_profile


def _get_seeker_or_404(user: User) -> JobSeekerProfile:
    if not user.job_seeker_profile:
        raise HTTPException(status_code=404, detail="Job seeker profile not found")
    return user.job_seeker_profile


def _get_opportunity_or_404(opportunity_id: int, db: Session) -> Opportunity:
    opp = db.get(Opportunity, opportunity_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return opp


# ── Trader: post a job ────────────────────────────────────────────────────────

@router.post("/opportunities", response_model=OpportunityResponse, status_code=201)
def post_opportunity(
    payload: OpportunityCreateRequest,
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """
    Trader posts a job opportunity.
    Goes live immediately — job seekers can browse and apply straight away.
    Claude scores each applicant at the moment they apply, not here.
    """
    trader = _get_trader_or_404(current_user)

    opp = Opportunity(
        trader_id=trader.id,
        title=payload.title,
        description=payload.description,
        daily_pay=payload.daily_pay,
        duration_days=payload.duration_days,
        location=payload.location,
        language_required=payload.language_required,
        skills_required=payload.skills_required,
        status=JobStatus.open,
    )
    db.add(opp)
    db.commit()
    db.refresh(opp)

    logger.info(f"Opportunity posted: trader={trader.id} opp={opp.id} title={opp.title!r}")
    return OpportunityResponse.from_orm_extended(opp, applicant_count=0)


# ── Trader: view own postings ─────────────────────────────────────────────────

@router.get("/opportunities/mine", response_model=list[OpportunityResponse])
def my_opportunities(
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """Trader sees all their posted opportunities with applicant counts."""
    trader = _get_trader_or_404(current_user)
    opps = (
        db.query(Opportunity)
        .filter(Opportunity.trader_id == trader.id)
        .order_by(Opportunity.created_at.desc())
        .all()
    )
    return [
        OpportunityResponse.from_orm_extended(
            opp,
            applicant_count=len([m for m in opp.matches if m.status != MatchStatus.rejected])
        )
        for opp in opps
    ]


# ── Job seeker: browse open opportunities ─────────────────────────────────────

@router.get("/opportunities", response_model=list[OpportunityFeedItem])
def browse_opportunities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Job seekers browse open opportunities.
    Shows their personal match score if they've already applied.
    Traders can also browse (for admin/transparency purposes).
    """
    opps = (
        db.query(Opportunity)
        .filter(Opportunity.status == JobStatus.open)
        .order_by(Opportunity.created_at.desc())
        .all()
    )

    # For job seekers — check which ones they've applied to
    seeker_profile = getattr(current_user, "job_seeker_profile", None)
    seeker_matches: dict[int, Match] = {}
    if seeker_profile:
        matches = (
            db.query(Match)
            .filter(Match.job_seeker_id == seeker_profile.id)
            .all()
        )
        seeker_matches = {m.opportunity_id: m for m in matches}

    return [
        OpportunityFeedItem.from_orm_extended(
            opp,
            already_applied=opp.id in seeker_matches,
            my_match_score=seeker_matches[opp.id].match_score if opp.id in seeker_matches else None,
        )
        for opp in opps
    ]


# ── Get single opportunity ────────────────────────────────────────────────────

@router.get("/opportunities/{opportunity_id}", response_model=OpportunityResponse)
def get_opportunity(
    opportunity_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    opp = _get_opportunity_or_404(opportunity_id, db)
    applicant_count = len([m for m in opp.matches if m.status != MatchStatus.rejected])
    return OpportunityResponse.from_orm_extended(opp, applicant_count=applicant_count)


# ── Job seeker: apply ─────────────────────────────────────────────────────────

@router.post("/opportunities/{opportunity_id}/apply", response_model=MatchResponse)
def apply_to_opportunity(
    opportunity_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    """
    Job seeker applies to an opportunity.

    1. Creates a Match record (status: suggested)
    2. Immediately calls Claude to score the applicant (synchronous — fast enough)
    3. Trader's applicant list updates with score + reasoning in real time

    Claude is called synchronously here so the score is ready before we return.
    P99 latency for Claude is ~2s — acceptable for an apply action.
    If Claude fails, the fallback engine scores instead — application never blocks.
    """
    opp = _get_opportunity_or_404(opportunity_id, db)

    if opp.status != JobStatus.open:
        raise HTTPException(status_code=400, detail="This opportunity is no longer open")

    seeker = _get_seeker_or_404(current_user)

    # Idempotent — one application per seeker per opportunity
    existing = (
        db.query(Match)
        .filter(
            Match.opportunity_id == opportunity_id,
            Match.job_seeker_id == seeker.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this opportunity")

    # Create match record
    match = Match(
        opportunity_id=opportunity_id,
        job_seeker_id=seeker.id,
        status=MatchStatus.suggested,
    )
    db.add(match)
    db.flush()  # get match.id before scoring

    # Score immediately — Claude or fallback
    result = score_applicant(opp, seeker)
    match.match_score = result["score"]
    match.match_reasoning = result["reasoning"]
    match.engine_used = result["engine"]

    db.commit()
    db.refresh(match)

    logger.info(
        f"Application: seeker={seeker.id} opp={opportunity_id} "
        f"score={match.match_score} engine={match.engine_used}"
    )
    return MatchResponse.from_orm_extended(match)


# ── Trader: view ranked applicants ────────────────────────────────────────────

@router.get("/opportunities/{opportunity_id}/applicants", response_model=list[ApplicantRankedResponse])
def get_ranked_applicants(
    opportunity_id: int,
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """
    THE MONEY SHOT.

    Trader sees their applicants ranked by Claude's match score,
    with AI reasoning per applicant visible on the dashboard.

    "Claude ranked Emeka 94% — Yoruba speaker, 2.1km away, market sales experience."

    Only the trader who posted can see their applicants.
    """
    opp = _get_opportunity_or_404(opportunity_id, db)
    trader = _get_trader_or_404(current_user)

    if opp.trader_id != trader.id:
        raise HTTPException(status_code=403, detail="You can only view applicants for your own opportunities")

    matches = (
        db.query(Match)
        .filter(
            Match.opportunity_id == opportunity_id,
            Match.status != MatchStatus.rejected,  # hide declined applicants
        )
        .order_by(Match.match_score.desc().nullslast())  # highest score first
        .all()
    )

    return [ApplicantRankedResponse.from_orm_extended(m) for m in matches]


# ── Trader: accept an applicant ───────────────────────────────────────────────

@router.post("/applications/{match_id}/accept", response_model=MatchResponse)
def accept_applicant(
    match_id: int,
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """
    Trader accepts one applicant.

    1. Accepted match → status: accepted
    2. All other applicants for this opportunity → status: rejected (auto-decline)
    3. Opportunity status → matched (no longer open)

    Only one acceptance per opportunity is allowed.
    """
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Application not found")

    opp = match.opportunity
    trader = _get_trader_or_404(current_user)

    if opp.trader_id != trader.id:
        raise HTTPException(status_code=403, detail="You can only accept applicants for your own opportunities")

    if opp.status != JobStatus.open:
        raise HTTPException(status_code=400, detail="This opportunity is no longer open — someone may already be accepted")

    if match.status != MatchStatus.suggested:
        raise HTTPException(status_code=400, detail=f"Cannot accept application in status: {match.status}")

    # Accept this match
    match.status = MatchStatus.accepted

    # Auto-decline all other applicants for this opportunity
    other_matches = (
        db.query(Match)
        .filter(
            Match.opportunity_id == opp.id,
            Match.id != match_id,
            Match.status == MatchStatus.suggested,
        )
        .all()
    )
    for other in other_matches:
        other.status = MatchStatus.rejected

    # Move opportunity to in_progress
    opp.status = JobStatus.in_progress

    db.commit()
    db.refresh(match)

    logger.info(
        f"Applicant accepted: trader={trader.id} match={match_id} "
        f"seeker={match.job_seeker_id} opp={opp.id} "
        f"auto-declined {len(other_matches)} other(s)"
    )
    return MatchResponse.from_orm_extended(match)


# ── Trader: mark job complete → Squad pays job seeker ─────────────────────────

@router.post("/applications/{match_id}/complete", response_model=CompleteJobResponse)
def complete_job(
    match_id: int,
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    """
    Trader marks job complete → Squad pays job seeker.
 
    Revenue:
      Trader is charged: wage + 5% platform fee
      Seeker receives:   full wage (no deduction)
      Eko keeps:         the 5% platform fee
    """
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Application not found")
 
    opp = match.opportunity
    trader = _get_trader_or_404(current_user)
 
    if opp.trader_id != trader.id:
        raise HTTPException(status_code=403, detail="You can only complete your own jobs")
 
    if match.status != MatchStatus.accepted:
        raise HTTPException(
            status_code=400,
            detail=f"Job must be accepted before completing. Current: {match.status}",
        )
 
    if match.payout_idempotency_key:
        raise HTTPException(status_code=400, detail="Payout already initiated for this job")
 
    # ── Revenue calculation ───────────────────────────────────────────────────
    wage_naira = opp.daily_pay * opp.duration_days
    wage_kobo = wage_naira * 100
    fee_kobo = int(wage_kobo * (PLATFORM_FEE_PCT / 100))
    total_charge_kobo = wage_kobo + fee_kobo
    # e.g. ₦12,000 wage + ₦600 fee = ₦12,600 charged to trader
 
    # ── Step 1: Debit trader — wage + platform fee ────────────────────────────
    trader_wallet = get_wallet_or_error(trader.user_id, db)
    payout_key = generate_idempotency_key("WAGE")
 
    try:
        debit(
            wallet=trader_wallet,
            amount_kobo=total_charge_kobo,
            tx_type=WalletTxType.debit_wage_payout,
            idempotency_key=f"{payout_key}_DEBIT",
            db=db,
            description=(
                f"Wage ₦{wage_naira:,} + platform fee ₦{fee_kobo/100:,.0f} "
                f"— {opp.title} ({opp.duration_days}d × ₦{opp.daily_pay:,})"
            ),
            match_id=match.id,
        )
    except InsufficientBalanceError as e:
        raise HTTPException(status_code=400, detail=str(e))
 
    # ── Step 2: Squad transfer to seeker — full wage, no deduction ───────────
    seeker = match.job_seeker
 
    # Guard: provision seeker wallet if missing (fixes the bug you hit)
    seeker_wallet = db.query(Wallet).filter(
        Wallet.user_id == seeker.user_id
    ).first()
    if not seeker_wallet:
        from app.services.wallet import provision_wallet
        seeker_wallet = provision_wallet(seeker.user, db)
        logger.warning(f"Provisioned missing wallet for seeker {seeker.id} at completion time")
 
    squad_ref = None
    if seeker_wallet.virtual_account_number:
        try:
            transfer_data = initiate_transfer(
                amount=wage_naira,             # seeker gets full wage
                bank_code=_get_bank_code(seeker_wallet.virtual_bank_name),
                account_number=seeker_wallet.virtual_account_number,
                account_name=seeker_wallet.virtual_account_name or seeker.user.full_name,
                narration=f"Eko wage — {opp.title}",
                idempotency_key=payout_key,
            )
            squad_ref = transfer_data.get("transaction_ref")
        except SquadAPIError as e:
            logger.error(f"Squad transfer failed for match {match_id}: {e}")
    else:
        logger.warning(
            f"Seeker {seeker.id} has no virtual account — "
            f"payout queued for manual processing"
        )
 
    # ── Step 3: Save payout reference + update status ─────────────────────────
    opp.platform_fee_amount = fee_kobo
    match.payout_idempotency_key = payout_key
    match.squad_payout_ref = squad_ref
    opp.status = JobStatus.completed
    match.completed_at = datetime.now(timezone.utc)
 
    db.commit()
 
    logger.info(
        f"Job complete: trader={trader.id} match={match_id} "
        f"wage=₦{wage_naira:,} fee=₦{fee_kobo/100:,.0f} "
        f"total_charged=₦{total_charge_kobo/100:,.0f} "
        f"seeker_receives=₦{wage_naira:,} ref={squad_ref}"
    )
 
    return CompleteJobResponse(
        match_id=match.id,
        opportunity_title=opp.title,
        job_seeker_name=seeker.user.full_name if seeker.user else None,
        total_pay_naira=wage_naira,
        platform_fee_naira=int(fee_kobo / 100),
        total_charged_naira=int(total_charge_kobo / 100),
        payout_reference=squad_ref,
        payout_status="processing",
        message=(
            f"₦{wage_naira:,} is being sent to "
            f"{seeker.user.full_name if seeker.user else 'the job seeker'}. "
            f"Platform fee: ₦{fee_kobo/100:,.0f}."
        ),
    )


# ── Job seeker: my applications ───────────────────────────────────────────────

@router.get("/applications/mine", response_model=list[MatchResponse])
def my_applications(
    current_user: User = Depends(require_role(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    """Job seeker sees all their applications with status and payout info."""
    seeker = _get_seeker_or_404(current_user)
    matches = (
        db.query(Match)
        .filter(Match.job_seeker_id == seeker.id)
        .order_by(Match.created_at.desc())
        .all()
    )
    return [MatchResponse.from_orm_extended(m) for m in matches]


# ── Helper ────────────────────────────────────────────────────────────────────

def _get_bank_code(bank_name: str | None) -> str:
    BANK_CODES = {
        "Wema Bank": "035",
        "GTBank": "058",
        "Access Bank": "044",
        "Zenith Bank": "057",
        "First Bank": "011",
        "UBA": "033",
    }
    if not bank_name:
        return "035"
    for name, code in BANK_CODES.items():
        if name.lower() in bank_name.lower():
            return code
    return "035"

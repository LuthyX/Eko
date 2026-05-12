from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, get_current_user, require_role,
)
from app.models.user import (
    User, UserRole, TraderProfile, JobSeekerProfile, IdentityTier,
)
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    VerifyIdentityRequest, UserResponse,
    TraderOnboardRequest, TraderProfileResponse,
    JobSeekerOnboardRequest, JobSeekerProfileResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.role,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, role=user.role, user_id=user.id)


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, role=user.role, user_id=user.id)


# ── Current user ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Identity verification ─────────────────────────────────────────────────────

@router.post("/verify-identity", response_model=UserResponse)
def verify_identity(
    payload: VerifyIdentityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accepts BVN and/or NIN. In production this calls Squad's identity
    verification endpoint. Here we store the *tier* only — never the number.
    """
    if not payload.bvn and not payload.nin:
        raise HTTPException(status_code=400, detail="Provide at least one of BVN or NIN")

    has_bvn = bool(payload.bvn)
    has_nin = bool(payload.nin)

    if has_bvn and has_nin:
        tier = IdentityTier.bvn_nin
    elif has_bvn:
        tier = IdentityTier.bvn
    else:
        tier = IdentityTier.nin

    # TODO (production): call Squad identity verification API here and confirm
    # the number is valid before setting the tier.

    current_user.identity_tier = tier
    db.commit()
    db.refresh(current_user)
    return current_user


# ── Trader onboarding ─────────────────────────────────────────────────────────

@router.post("/onboard/trader", response_model=TraderProfileResponse)
def onboard_trader(
    payload: TraderOnboardRequest,
    current_user: User = Depends(require_role(UserRole.trader)),
    db: Session = Depends(get_db),
):
    if current_user.trader_profile:
        raise HTTPException(status_code=409, detail="Trader profile already exists")

    profile = TraderProfile(
        user_id=current_user.id,
        business_name=payload.business_name,
        business_category=payload.business_category,
        market_location=payload.market_location,
        squad_merchant_id=payload.squad_merchant_id,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return TraderProfileResponse.from_orm_extended(profile)


@router.get("/onboard/trader/me", response_model=TraderProfileResponse)
def get_trader_profile(
    current_user: User = Depends(require_role(UserRole.trader)),
):
    if not current_user.trader_profile:
        raise HTTPException(status_code=404, detail="Trader profile not found")
    return TraderProfileResponse.from_orm_extended(current_user.trader_profile)


# ── Job seeker onboarding ─────────────────────────────────────────────────────

@router.post("/onboard/job-seeker", response_model=JobSeekerProfileResponse)
def onboard_job_seeker(
    payload: JobSeekerOnboardRequest,
    current_user: User = Depends(require_role(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    if current_user.job_seeker_profile:
        raise HTTPException(status_code=409, detail="Job seeker profile already exists")

    profile = JobSeekerProfile(
        user_id=current_user.id,
        skills=payload.skills,
        languages=payload.languages,
        location=payload.location,
        daily_rate_expectation=payload.daily_rate_expectation,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/onboard/job-seeker/me", response_model=JobSeekerProfileResponse)
def get_job_seeker_profile(
    current_user: User = Depends(require_role(UserRole.job_seeker)),
):
    if not current_user.job_seeker_profile:
        raise HTTPException(status_code=404, detail="Job seeker profile not found")
    return current_user.job_seeker_profile
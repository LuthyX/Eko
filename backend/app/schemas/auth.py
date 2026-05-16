from pydantic import BaseModel, EmailStr, field_validator
from app.models.user import UserRole, IdentityTier


# ── Register ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole
    phone: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int


# ── Identity verification ─────────────────────────────────────────────────────

class VerifyIdentityRequest(BaseModel):
    bvn: str | None = None
    nin: str | None = None

    @field_validator("bvn")
    @classmethod
    def validate_bvn(cls, v: str | None) -> str | None:
        if v and len(v) != 11:
            raise ValueError("BVN must be 11 digits")
        return v

    @field_validator("nin")
    @classmethod
    def validate_nin(cls, v: str | None) -> str | None:
        if v and len(v) != 11:
            raise ValueError("NIN must be 11 digits")
        return v


# ── User response ─────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    identity_tier: IdentityTier
    is_active: bool

    model_config = {"from_attributes": True}


# ── Trader onboarding ─────────────────────────────────────────────────────────

class TraderOnboardRequest(BaseModel):
    business_name: str
    business_category: str
    market_location: str
    squad_merchant_id: str | None = None


class TraderProfileResponse(BaseModel):
    id: int
    user_id: int
    full_name: str | None          # NEW — from profile.user.full_name
    phone: str | None              # NEW — from profile.user.phone
    business_name: str | None
    business_category: str | None
    market_location: str | None
    squad_merchant_id: str | None
    squad_linked: bool

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_extended(cls, profile):
        return cls(
            id=profile.id,
            user_id=profile.user_id,
            full_name=profile.user.full_name if profile.user else None,
            phone=profile.user.phone if profile.user else None,
            business_name=profile.business_name,
            business_category=profile.business_category,
            market_location=profile.market_location,
            squad_merchant_id=profile.squad_merchant_id,
            squad_linked=profile.squad_merchant_id is not None,
        )


# ── Job seeker onboarding ─────────────────────────────────────────────────────

class JobSeekerOnboardRequest(BaseModel):
    skills: list[str]
    languages: list[str]
    location: str
    daily_rate_expectation: int | None = None


class JobSeekerProfileResponse(BaseModel):
    id: int
    user_id: int
    skills: list[str] | None
    languages: list[str] | None
    location: str | None
    daily_rate_expectation: int | None

    model_config = {"from_attributes": True}

class JobSeekerUpdateRequest(BaseModel):
    skills: list[str] | None = None
    languages: list[str] | None = None
    location: str | None = None
    daily_rate_expectation: int | None = None
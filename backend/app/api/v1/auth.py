# app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, Trader, JobSeeker
from app.schemas.auth import TraderRegistration, SeekerRegistration, RegistrationResponse

router = APIRouter()

# Helper function to calculate starting score
def calculate_cold_start_score(tier: int, category: str) -> float:
    # Baseline logic based on EFInA/NBS medians (simplified for day 1)
    base = 20.0
    tier_bonus = tier * 5.0
    return base + tier_bonus

@router.post("/register/trader", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
def register_trader(payload: TraderRegistration, db: Session = Depends(get_db)):
    # 1. Check if user exists
    if db.query(User).filter(User.phone_number == payload.phone_number).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # 2. Create Base User
    new_user = User(role="trader", name=payload.name, phone_number=payload.phone_number)
    db.add(new_user)
    db.flush() # Get the new_user.id without committing yet
    
    # 3. Create Trader Profile with Cold Start Score
    starting_score = calculate_cold_start_score(tier=1, category=payload.business_category)
    new_trader = Trader(
        user_id=new_user.id,
        business_category=payload.business_category,
        bvn_nin_tier=1,
        eko_score=starting_score
    )
    db.add(new_trader)
    db.commit()
    
    return {"user_id": new_user.id, "message": "Trader registered successfully. Pending Squad link."}

@router.post("/register/seeker", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
def register_seeker(payload: SeekerRegistration, db: Session = Depends(get_db)):
    if db.query(User).filter(User.phone_number == payload.phone_number).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")
        
    new_user = User(role="seeker", name=payload.name, phone_number=payload.phone_number)
    db.add(new_user)
    db.flush()
    
    new_seeker = JobSeeker(
        user_id=new_user.id,
        location=payload.location,
        primary_language=payload.primary_language,
        skills=payload.skills,
        daily_pay_expectation=payload.daily_pay_expectation
    )
    db.add(new_seeker)
    db.commit()
    
    return {"user_id": new_user.id, "message": "Job Seeker registered successfully."}
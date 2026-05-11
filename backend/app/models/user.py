# app/models/user.py
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, ARRAY
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    role = Column(String, nullable=False) # 'trader' or 'seeker'
    name = Column(String, nullable=False)
    phone_number = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Trader(Base):
    __tablename__ = "traders"
    
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    business_category = Column(String, nullable=False) # e.g., 'fabric', 'perishables'
    squad_account_id = Column(String, unique=True, nullable=True) # Linked after registration
    bvn_nin_tier = Column(Integer, default=1) # 1: Unverified, 2: BVN, 3: NIN
    eko_score = Column(Float, default=0.0)
    eko_save_balance = Column(Float, default=0.0)

class JobSeeker(Base):
    __tablename__ = "job_seekers"
    
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    location = Column(String, nullable=False)
    primary_language = Column(String, nullable=False)
    skills = Column(ARRAY(String), default=[])
    daily_pay_expectation = Column(Float, nullable=False)
#!/usr/bin/env python
"""Quick script to create a test trader user for development."""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole, TraderProfile, IdentityTier

db = SessionLocal()

# Check if user already exists
existing = db.query(User).filter(User.email == "trader@example.com").first()
if existing:
    print(f"✓ User already exists: {existing.email} (ID: {existing.id})")
    db.close()
    sys.exit(0)

# Create test trader user
user = User(
    email="trader@example.com",
    full_name="John Trader",
    phone="+2348123456789",
    role=UserRole.trader,
    hashed_password=hash_password("password123"),
    is_active=True,
    identity_tier=IdentityTier.none,
)
db.add(user)
db.commit()
db.refresh(user)

# Create trader profile
trader = TraderProfile(
    user_id=user.id,
    business_name="John's Trading Post",
    business_category="general_merchandise",
    market_location="Lagos",
)
db.add(trader)
db.commit()

print(f"✓ Created test user: {user.email}")
print(f"  User ID: {user.id}")
print(f"  Role: {user.role}")
print(f"  Password: password123")
print(f"\nUse this token in requests:")
print(f"  POST /auth/login")
print(f"  Body: {{'email': 'trader@example.com', 'password': 'password123'}}")

db.close()

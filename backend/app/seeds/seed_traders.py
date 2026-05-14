"""
Seed script — Phase 2.

Creates 5 demo traders with realistic Squad transaction histories
and computes their EkoScores. Run this once after Phase 1 migrations.

Usage:
    python -m app.seeds.seed_traders

Traders seeded:
  1. Amaka Okonkwo   — fabric,      Balogun Market     → ~74/100  (Tier A, credit eligible)
  2. Chidi Nwosu     — tech_retail, Computer Village   → ~68/100  (Tier A, credit eligible)
  3. Fatima Abdullahi — perishables, Mile 12 Market    → ~58/100  (Tier B, not yet eligible)
  4. Biodun Adeyemi  — cosmetics,   Balogun Market     → ~42/100  (Tier C, cold-start-ish)
  5. Emeka Eze       — job_seeker,  Surulere           → job seeker profile (no score)
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from datetime import datetime, timezone, timedelta
import random

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import (
    User, UserRole, IdentityTier,
    TraderProfile, JobSeekerProfile,
)
from app.services.ekoscore import compute_ekoscore, _cold_start_score


def make_transactions(
    n: int,
    avg_amount: int,
    std_amount: int,
    days_back: int,
    seed: int = 42,
) -> list[dict]:
    """Generate realistic transaction history."""
    random.seed(seed)
    transactions = []
    now = datetime.now(timezone.utc)
    for i in range(n):
        amount = max(500, int(random.gauss(avg_amount, std_amount)))
        days_ago = random.uniform(0, days_back)
        ts = now - timedelta(days=days_ago)
        transactions.append({"amount": amount, "created_at": ts})
    return sorted(transactions, key=lambda t: t["created_at"])


def seed(db):
    print("🌱 Seeding demo traders...")

    # ── 1. Amaka — fabric trader, 8 months active, target score ~74 ──────────
    amaka_user = db.query(User).filter(User.email == "amaka@eko.demo").first()
    if not amaka_user:
        amaka_user = User(
            email="amaka@eko.demo",
            full_name="Amaka Okonkwo",
            phone="08011111111",
            role=UserRole.trader,
            hashed_password=hash_password("demo1234"),
            identity_tier=IdentityTier.bvn_nin,
            is_active=True,
        )
        db.add(amaka_user)
        db.flush()

        amaka_profile = TraderProfile(
            user_id=amaka_user.id,
            business_name="Amaka Fabrics",
            business_category="fabric",
            market_location="Balogun Market, Lagos Island",
            squad_merchant_id="SQUAD_AMAKA_001",
            squad_linked_at=datetime.now(timezone.utc) - timedelta(days=240),
        )
        db.add(amaka_profile)
        db.flush()

        amaka_txns = make_transactions(
            n=87, avg_amount=18_000, std_amount=6_000,
            days_back=240, seed=1,
        )
        score = compute_ekoscore(amaka_profile, amaka_txns, db)
        print(f"  ✅ Amaka — EkoScore: {score.score}/100  Tier: {score.risk_tier}")
    else:
        print("  ⏭  Amaka already seeded")

    # ── 2. Chidi — tech retail, Computer Village, ~68 ────────────────────────
    chidi_user = db.query(User).filter(User.email == "chidi@eko.demo").first()
    if not chidi_user:
        chidi_user = User(
            email="chidi@eko.demo",
            full_name="Chidi Nwosu",
            phone="08022222222",
            role=UserRole.trader,
            hashed_password=hash_password("demo1234"),
            identity_tier=IdentityTier.bvn,
            is_active=True,
        )
        db.add(chidi_user)
        db.flush()

        chidi_profile = TraderProfile(
            user_id=chidi_user.id,
            business_name="Chidi Tech Hub",
            business_category="tech_retail",
            market_location="Computer Village, Ikeja",
            squad_merchant_id="SQUAD_CHIDI_002",
            squad_linked_at=datetime.now(timezone.utc) - timedelta(days=180),
        )
        db.add(chidi_profile)
        db.flush()

        chidi_txns = make_transactions(
            n=64, avg_amount=35_000, std_amount=12_000,
            days_back=180, seed=2,
        )
        score = compute_ekoscore(chidi_profile, chidi_txns, db)
        print(f"  ✅ Chidi — EkoScore: {score.score}/100  Tier: {score.risk_tier}")
    else:
        print("  ⏭  Chidi already seeded")

    # ── 3. Fatima — perishables, Mile 12, ~58 ────────────────────────────────
    fatima_user = db.query(User).filter(User.email == "fatima@eko.demo").first()
    if not fatima_user:
        fatima_user = User(
            email="fatima@eko.demo",
            full_name="Fatima Abdullahi",
            phone="08033333333",
            role=UserRole.trader,
            hashed_password=hash_password("demo1234"),
            identity_tier=IdentityTier.bvn,
            is_active=True,
        )
        db.add(fatima_user)
        db.flush()

        fatima_profile = TraderProfile(
            user_id=fatima_user.id,
            business_name="Fatima Fresh Foods",
            business_category="perishables",
            market_location="Mile 12 Market, Lagos",
            squad_merchant_id="SQUAD_FATIMA_003",
            squad_linked_at=datetime.now(timezone.utc) - timedelta(days=120),
        )
        db.add(fatima_profile)
        db.flush()

        fatima_txns = make_transactions(
            n=45, avg_amount=12_000, std_amount=4_000,
            days_back=120, seed=3,
        )
        score = compute_ekoscore(fatima_profile, fatima_txns, db)
        print(f"  ✅ Fatima — EkoScore: {score.score}/100  Tier: {score.risk_tier}")
    else:
        print("  ⏭  Fatima already seeded")

    # ── 4. Biodun — cosmetics, low volume, cold-start-ish ~42 ────────────────
    biodun_user = db.query(User).filter(User.email == "biodun@eko.demo").first()
    if not biodun_user:
        biodun_user = User(
            email="biodun@eko.demo",
            full_name="Biodun Adeyemi",
            phone="08044444444",
            role=UserRole.trader,
            hashed_password=hash_password("demo1234"),
            identity_tier=IdentityTier.none,
            is_active=True,
        )
        db.add(biodun_user)
        db.flush()

        biodun_profile = TraderProfile(
            user_id=biodun_user.id,
            business_name="Biodun Beauty",
            business_category="cosmetics",
            market_location="Balogun Market, Lagos Island",
            squad_merchant_id="SQUAD_BIODUN_004",
            squad_linked_at=datetime.now(timezone.utc) - timedelta(days=30),
        )
        db.add(biodun_profile)
        db.flush()

        # Only 3 transactions — triggers cold-start path
        biodun_txns = make_transactions(
            n=3, avg_amount=8_000, std_amount=2_000,
            days_back=30, seed=4,
        )
        score = compute_ekoscore(biodun_profile, biodun_txns, db)
        print(f"  ✅ Biodun — EkoScore: {score.score}/100  Tier: {score.risk_tier} (cold-start)")
    else:
        print("  ⏭  Biodun already seeded")

    # ── 5. Emeka — job seeker ─────────────────────────────────────────────────
    emeka_user = db.query(User).filter(User.email == "emeka@eko.demo").first()
    if not emeka_user:
        emeka_user = User(
            email="emeka@eko.demo",
            full_name="Emeka Eze",
            phone="08055555555",
            role=UserRole.job_seeker,
            hashed_password=hash_password("demo1234"),
            identity_tier=IdentityTier.bvn,
            is_active=True,
        )
        db.add(emeka_user)
        db.flush()

        emeka_profile = JobSeekerProfile(
            user_id=emeka_user.id,
            skills=["carrying", "selling", "cashier", "inventory"],
            languages=["yoruba", "english", "pidgin"],
            location="Surulere, Lagos",
            daily_rate_expectation=4000,
            squad_account_id="SQUAD_EMEKA_005",
        )
        db.add(emeka_profile)
        db.flush()
        print(f"  ✅ Emeka — job seeker profile created")
    else:
        print("  ⏭  Emeka already seeded")

    db.commit()
    print("\n✅ Seed complete. Demo accounts:")
    print("   Email pattern: amaka@eko.demo, chidi@eko.demo, fatima@eko.demo")
    print("   Password: demo1234 (all accounts)")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
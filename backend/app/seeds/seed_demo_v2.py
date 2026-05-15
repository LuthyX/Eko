"""
Eko Demo Seed Script — v2
==========================
Seeds a rich demo dataset for the hackathon demo.

What's seeded:
  Traders (4):
    - Amaka Okonkwo    fabric       Balogun Market    score ~74  credit eligible
    - Chidi Nwosu      tech_retail  Computer Village  score ~68  credit eligible
    - Fatima Abdullahi perishables  Mile 12           score ~58  below threshold
    - Biodun Adeyemi   cosmetics    Balogun Market    score ~42  cold start

  Job seekers (4):
    - Emeka Eze        Surulere     selling/carrying  ₦4,000/day  3 completed jobs ★4.8
    - Adesola Fashola  Isale Eko    selling/cashier   ₦3,500/day  1 completed job  ★4.0
    - Taiwo Idowu      Agege        loading/delivery  ₦3,000/day  new — no history
    - Ngozi Okafor     Yaba         inventory/cashier ₦3,500/day  2 completed jobs ★4.5

  Open opportunities (3):
    - Amaka: Market sales assistant   ₦4,000/day  3 days  yoruba
    - Chidi: Electronics shop keeper  ₦3,500/day  5 days  english
    - Fatima: Loading assistant       ₦3,000/day  2 days  pidgin

  Completed matches with ratings (3):
    - Emeka completed 3 past jobs → avg rating 4.8★  (strong profile)
    - Ngozi completed 2 past jobs → avg rating 4.5★  (good profile)
    - Adesola completed 1 past job → avg rating 4.0★ (building)

Usage:
    python -m app.seeds.seed_demo_v2

Safe to run multiple times — skips already-seeded records.
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
    Opportunity, JobStatus,
    Match, MatchStatus,
)
from app.models.wallet import Wallet
from app.services.ekoscore import compute_ekoscore, _cold_start_score


def utcnow():
    return datetime.now(timezone.utc)


def make_transactions(n, avg_amount, std_amount, days_back, seed=42):
    random.seed(seed)
    now = datetime.now(timezone.utc)
    txns = []
    for _ in range(n):
        amount = max(500, int(random.gauss(avg_amount, std_amount)))
        days_ago = random.uniform(0, days_back)
        ts = now - timedelta(days=days_ago)
        txns.append({"amount": amount, "created_at": ts})
    return sorted(txns, key=lambda t: t["created_at"])


def provision_fake_wallet(user, db, acct_suffix):
    """Create a wallet with a realistic-looking fake VA number."""
    existing = db.query(Wallet).filter(Wallet.user_id == user.id).first()
    if existing:
        return existing
    import hashlib
    hash_val = int(hashlib.md5(user.email.encode()).hexdigest(), 16)
    acct_num = f"07{hash_val % 100000000:08d}"
    wallet = Wallet(
        user_id=user.id,
        squad_customer_identifier=f"EKO_USER_{user.id}",
        balance_kobo=0,
        virtual_account_number=acct_num,
        virtual_bank_name="Wema Bank",
        virtual_account_name=f"EKO/{user.full_name.upper()}",
        is_active=True,
    )
    db.add(wallet)
    db.flush()
    return wallet


def seed(db):
    print("🌱 Seeding Eko demo data v2...\n")

    # ── TRADERS ──────────────────────────────────────────────────────────────

    print("── Traders ──")

    # Amaka
    amaka_user = db.query(User).filter(User.email == "amaka@eko.demo").first()
    if not amaka_user:
        amaka_user = User(
            email="amaka@eko.demo", full_name="Amaka Okonkwo",
            phone="08011111111", role=UserRole.trader,
            hashed_password=hash_password("demo1234"),
            identity_tier=IdentityTier.bvn_nin, is_active=True,
        )
        db.add(amaka_user); db.flush()
        amaka_profile = TraderProfile(
            user_id=amaka_user.id, business_name="Amaka Fabrics",
            business_category="fabric", market_location="Balogun Market, Lagos Island",
            squad_merchant_id="SQUAD_AMAKA_001",
            squad_linked_at=utcnow() - timedelta(days=240),
        )
        db.add(amaka_profile); db.flush()
        score = compute_ekoscore(amaka_profile, make_transactions(87, 18000, 6000, 240, 1), db)
        print(f"  ✅ Amaka — score: {score.score:.1f} tier: {score.risk_tier}")
    else:
        amaka_profile = amaka_user.trader_profile
        print("  ⏭  Amaka already seeded")

    provision_fake_wallet(amaka_user, db, "amaka")

    # Chidi
    chidi_user = db.query(User).filter(User.email == "chidi@eko.demo").first()
    if not chidi_user:
        chidi_user = User(
            email="chidi@eko.demo", full_name="Chidi Nwosu",
            phone="08022222222", role=UserRole.trader,
            hashed_password=hash_password("demo1234"),
            identity_tier=IdentityTier.bvn, is_active=True,
        )
        db.add(chidi_user); db.flush()
        chidi_profile = TraderProfile(
            user_id=chidi_user.id, business_name="Chidi Tech Hub",
            business_category="tech_retail", market_location="Computer Village, Ikeja",
            squad_merchant_id="SQUAD_CHIDI_002",
            squad_linked_at=utcnow() - timedelta(days=180),
        )
        db.add(chidi_profile); db.flush()
        score = compute_ekoscore(chidi_profile, make_transactions(64, 35000, 12000, 180, 2), db)
        print(f"  ✅ Chidi — score: {score.score:.1f} tier: {score.risk_tier}")
    else:
        chidi_profile = chidi_user.trader_profile
        print("  ⏭  Chidi already seeded")

    provision_fake_wallet(chidi_user, db, "chidi")

    # Fatima
    fatima_user = db.query(User).filter(User.email == "fatima@eko.demo").first()
    if not fatima_user:
        fatima_user = User(
            email="fatima@eko.demo", full_name="Fatima Abdullahi",
            phone="08033333333", role=UserRole.trader,
            hashed_password=hash_password("demo1234"),
            identity_tier=IdentityTier.bvn, is_active=True,
        )
        db.add(fatima_user); db.flush()
        fatima_profile = TraderProfile(
            user_id=fatima_user.id, business_name="Fatima Fresh Foods",
            business_category="perishables", market_location="Mile 12 Market, Lagos",
            squad_merchant_id="SQUAD_FATIMA_003",
            squad_linked_at=utcnow() - timedelta(days=120),
        )
        db.add(fatima_profile); db.flush()
        score = compute_ekoscore(fatima_profile, make_transactions(45, 12000, 4000, 120, 3), db)
        print(f"  ✅ Fatima — score: {score.score:.1f} tier: {score.risk_tier}")
    else:
        fatima_profile = fatima_user.trader_profile
        print("  ⏭  Fatima already seeded")

    provision_fake_wallet(fatima_user, db, "fatima")

    # Biodun
    biodun_user = db.query(User).filter(User.email == "biodun@eko.demo").first()
    if not biodun_user:
        biodun_user = User(
            email="biodun@eko.demo", full_name="Biodun Adeyemi",
            phone="08044444444", role=UserRole.trader,
            hashed_password=hash_password("demo1234"),
            identity_tier=IdentityTier.none, is_active=True,
        )
        db.add(biodun_user); db.flush()
        biodun_profile = TraderProfile(
            user_id=biodun_user.id, business_name="Biodun Beauty",
            business_category="cosmetics", market_location="Balogun Market, Lagos Island",
            squad_merchant_id="SQUAD_BIODUN_004",
            squad_linked_at=utcnow() - timedelta(days=30),
        )
        db.add(biodun_profile); db.flush()
        score = compute_ekoscore(biodun_profile, make_transactions(3, 8000, 2000, 30, 4), db)
        print(f"  ✅ Biodun — score: {score.score:.1f} (cold start)")
    else:
        print("  ⏭  Biodun already seeded")

    db.commit()

    # ── JOB SEEKERS ───────────────────────────────────────────────────────────

    print("\n── Job seekers ──")

    # Emeka — strong profile (3 completed jobs, 4.8★)
    emeka_user = db.query(User).filter(User.email == "emeka@eko.demo").first()
    if not emeka_user:
        emeka_user = User(
            email="emeka@eko.demo", full_name="Emeka Eze",
            phone="08055555555", role=UserRole.job_seeker,
            hashed_password=hash_password("demo1234"),
            identity_tier=IdentityTier.bvn, is_active=True,
        )
        db.add(emeka_user); db.flush()
        emeka_profile = JobSeekerProfile(
            user_id=emeka_user.id,
            skills=["selling", "carrying", "customer service", "cashier", "inventory"],
            languages=["yoruba", "english", "pidgin"],
            location="Surulere, Lagos",
            daily_rate_expectation=4000,
            squad_account_id="SQUAD_EMEKA_005",
            jobs_completed=3,
            jobs_accepted=3,
            avg_rating=4.8,
        )
        db.add(emeka_profile); db.flush()
        print(f"  ✅ Emeka — job seeker · 3 jobs completed · ★4.8")
    else:
        # Update existing Emeka with job history
        profile = emeka_user.job_seeker_profile
        if profile and profile.jobs_completed == 0:
            profile.jobs_completed = 3
            profile.jobs_accepted = 3
            profile.avg_rating = 4.8
            print(f"  🔄 Emeka — updated with job history · 3 jobs · ★4.8")
        else:
            print(f"  ⏭  Emeka already seeded")

    provision_fake_wallet(emeka_user, db, "emeka")

    # Adesola — building profile (1 completed job, 4.0★)
    adesola_user = db.query(User).filter(User.email == "adesola@eko.demo").first()
    if not adesola_user:
        adesola_user = User(
            email="adesola@eko.demo", full_name="Adesola Fashola",
            phone="08066666666", role=UserRole.job_seeker,
            hashed_password=hash_password("demo1234"),
            identity_tier=IdentityTier.bvn, is_active=True,
        )
        db.add(adesola_user); db.flush()
        adesola_profile = JobSeekerProfile(
            user_id=adesola_user.id,
            skills=["selling", "cashier", "customer service"],
            languages=["yoruba", "english"],
            location="Isale Eko, Lagos Island",
            daily_rate_expectation=3500,
            jobs_completed=1,
            jobs_accepted=1,
            avg_rating=4.0,
        )
        db.add(adesola_profile); db.flush()
        print(f"  ✅ Adesola — job seeker · 1 job completed · ★4.0")
    else:
        print(f"  ⏭  Adesola already seeded")

    provision_fake_wallet(adesola_user, db, "adesola")

    # Taiwo — new (no history)
    taiwo_user = db.query(User).filter(User.email == "taiwo@eko.demo").first()
    if not taiwo_user:
        taiwo_user = User(
            email="taiwo@eko.demo", full_name="Taiwo Idowu",
            phone="08077777777", role=UserRole.job_seeker,
            hashed_password=hash_password("demo1234"),
            identity_tier=IdentityTier.none, is_active=True,
        )
        db.add(taiwo_user); db.flush()
        taiwo_profile = JobSeekerProfile(
            user_id=taiwo_user.id,
            skills=["loading", "delivery", "carrying"],
            languages=["english", "pidgin"],
            location="Agege, Lagos",
            daily_rate_expectation=3000,
            jobs_completed=0,
            jobs_accepted=0,
            avg_rating=0.0,
        )
        db.add(taiwo_profile); db.flush()
        print(f"  ✅ Taiwo — job seeker · new · no history")
    else:
        print(f"  ⏭  Taiwo already seeded")

    provision_fake_wallet(taiwo_user, db, "taiwo")

    # Ngozi — good profile (2 completed jobs, 4.5★)
    ngozi_user = db.query(User).filter(User.email == "ngozi@eko.demo").first()
    if not ngozi_user:
        ngozi_user = User(
            email="ngozi@eko.demo", full_name="Ngozi Okafor",
            phone="08088888888", role=UserRole.job_seeker,
            hashed_password=hash_password("demo1234"),
            identity_tier=IdentityTier.bvn, is_active=True,
        )
        db.add(ngozi_user); db.flush()
        ngozi_profile = JobSeekerProfile(
            user_id=ngozi_user.id,
            skills=["inventory", "cashier", "shop keeping", "customer service"],
            languages=["igbo", "english", "pidgin"],
            location="Yaba, Lagos",
            daily_rate_expectation=3500,
            jobs_completed=2,
            jobs_accepted=2,
            avg_rating=4.5,
        )
        db.add(ngozi_profile); db.flush()
        print(f"  ✅ Ngozi — job seeker · 2 jobs completed · ★4.5")
    else:
        print(f"  ⏭  Ngozi already seeded")

    provision_fake_wallet(ngozi_user, db, "ngozi")

    db.commit()

    # ── OPEN OPPORTUNITIES ────────────────────────────────────────────────────

    print("\n── Open opportunities ──")

    # Amaka's open job (for the demo money shot)
    amaka_open = db.query(Opportunity).filter(
        Opportunity.trader_id == amaka_profile.id,
        Opportunity.status == JobStatus.open,
        Opportunity.title == "Market sales assistant",
    ).first()

    if not amaka_open:
        amaka_open = Opportunity(
            trader_id=amaka_profile.id,
            title="Market sales assistant",
            description="Need help at my fabric stall during festive season rush. Yoruba speaker preferred. Hard worker welcome.",
            daily_pay=4000,
            duration_days=3,
            location="Balogun Market, Lagos Island",
            language_required="yoruba",
            skills_required=["selling", "customer service"],
            status=JobStatus.open,
        )
        db.add(amaka_open); db.flush()
        print(f"  ✅ Amaka's job posted — id={amaka_open.id} · ₦4,000/day · 3 days")
    else:
        print(f"  ⏭  Amaka's open job already exists (id={amaka_open.id})")

    # Chidi's open job
    chidi_open = db.query(Opportunity).filter(
        Opportunity.trader_id == chidi_profile.id,
        Opportunity.status == JobStatus.open,
    ).first()

    if not chidi_open:
        chidi_open = Opportunity(
            trader_id=chidi_profile.id,
            title="Electronics shop keeper",
            description="Need a reliable shop keeper for my tech stall. English speaker. Good with customers.",
            daily_pay=3500,
            duration_days=5,
            location="Computer Village, Ikeja",
            language_required="english",
            skills_required=["shop keeping", "customer service", "inventory"],
            status=JobStatus.open,
        )
        db.add(chidi_open); db.flush()
        print(f"  ✅ Chidi's job posted — id={chidi_open.id} · ₦3,500/day · 5 days")
    else:
        print(f"  ⏭  Chidi's open job already exists")

    # Fatima's open job
    fatima_open = db.query(Opportunity).filter(
        Opportunity.trader_id == fatima_profile.id,
        Opportunity.status == JobStatus.open,
    ).first()

    if not fatima_open:
        fatima_open = Opportunity(
            trader_id=fatima_profile.id,
            title="Loading and delivery assistant",
            description="Need someone to help load and deliver fresh produce. Must be available early mornings.",
            daily_pay=3000,
            duration_days=2,
            location="Mile 12 Market, Lagos",
            language_required="pidgin",
            skills_required=["loading", "delivery", "carrying"],
            status=JobStatus.open,
        )
        db.add(fatima_open); db.flush()
        print(f"  ✅ Fatima's job posted — id={fatima_open.id} · ₦3,000/day · 2 days")
    else:
        print(f"  ⏭  Fatima's open job already exists")

    db.commit()

    # ── COMPLETED MATCHES WITH RATINGS (past job history) ─────────────────────
    # These give Emeka, Ngozi, and Adesola their work history
    # Uses a separate "history" trader (Chidi and Fatima as past employers)

    print("\n── Past completed matches (work history) ──")

    emeka_profile = emeka_user.job_seeker_profile

    # Only seed if Emeka has no completed matches yet
    emeka_completed = db.query(Match).filter(
        Match.job_seeker_id == emeka_profile.id,
        Match.status == MatchStatus.completed,
    ).count()

    if emeka_completed == 0:
        # Create 3 past completed jobs for Emeka
        past_jobs = [
            {
                "trader_profile": chidi_profile,
                "title": "Shop assistant · electronics",
                "daily_pay": 3500,
                "duration_days": 2,
                "location": "Computer Village, Ikeja",
                "language_required": "english",
                "skills_required": ["selling", "customer service"],
                "trader_rating": 5,
                "trader_comment": "Excellent worker, very punctual and helpful with customers",
                "days_ago": 45,
            },
            {
                "trader_profile": fatima_profile,
                "title": "Loading and market help",
                "daily_pay": 3000,
                "duration_days": 1,
                "location": "Mile 12 Market, Lagos",
                "language_required": "pidgin",
                "skills_required": ["loading", "carrying"],
                "trader_rating": 5,
                "trader_comment": "Strong and reliable, came early and worked hard",
                "days_ago": 30,
            },
            {
                "trader_profile": chidi_profile,
                "title": "Cashier cover · festive season",
                "daily_pay": 3500,
                "duration_days": 3,
                "location": "Computer Village, Ikeja",
                "language_required": "english",
                "skills_required": ["cashier", "customer service"],
                "trader_rating": 4,
                "trader_comment": "Good work, customers liked him",
                "days_ago": 15,
            },
        ]

        for i, job in enumerate(past_jobs):
            past_time = utcnow() - timedelta(days=job["days_ago"])
            opp = Opportunity(
                trader_id=job["trader_profile"].id,
                title=job["title"],
                daily_pay=job["daily_pay"],
                duration_days=job["duration_days"],
                location=job["location"],
                language_required=job["language_required"],
                skills_required=job["skills_required"],
                status=JobStatus.completed,
                created_at=past_time - timedelta(days=5),
            )
            db.add(opp); db.flush()

            match = Match(
                opportunity_id=opp.id,
                job_seeker_id=emeka_profile.id,
                match_score=round(88 + i * 3, 1),
                match_reasoning=f"Strong fit — Yoruba speaker with selling experience",
                engine_used="claude",
                status=MatchStatus.completed,
                trader_rating=job["trader_rating"],
                trader_comment=job["trader_comment"],
                seeker_rating=5,
                seeker_comment="Good pay, fair trader",
                paid_at=past_time,
                completed_at=past_time,
                created_at=past_time - timedelta(days=1),
            )
            db.add(match)

        db.flush()
        print(f"  ✅ Emeka — 3 completed matches seeded · avg ★4.8")
    else:
        print(f"  ⏭  Emeka already has {emeka_completed} completed match(es)")

    # Ngozi — 2 completed jobs
    ngozi_profile = ngozi_user.job_seeker_profile
    ngozi_completed = db.query(Match).filter(
        Match.job_seeker_id == ngozi_profile.id,
        Match.status == MatchStatus.completed,
    ).count()

    if ngozi_completed == 0:
        for i, (days_ago, rating) in enumerate([(60, 4), (35, 5)]):
            past_time = utcnow() - timedelta(days=days_ago)
            opp = Opportunity(
                trader_id=chidi_profile.id,
                title=f"Inventory assistant · tech stall",
                daily_pay=3500,
                duration_days=2,
                location="Computer Village, Ikeja",
                language_required="english",
                skills_required=["inventory", "cashier"],
                status=JobStatus.completed,
                created_at=past_time - timedelta(days=3),
            )
            db.add(opp); db.flush()
            match = Match(
                opportunity_id=opp.id,
                job_seeker_id=ngozi_profile.id,
                match_score=82.0,
                match_reasoning="Good inventory skills, reliable attendance",
                engine_used="claude",
                status=MatchStatus.completed,
                trader_rating=rating,
                trader_comment="Reliable worker" if rating >= 4 else "Did okay",
                paid_at=past_time,
                completed_at=past_time,
                created_at=past_time - timedelta(days=1),
            )
            db.add(match)
        db.flush()
        print(f"  ✅ Ngozi — 2 completed matches seeded · avg ★4.5")
    else:
        print(f"  ⏭  Ngozi already has {ngozi_completed} completed match(es)")

    # Adesola — 1 completed job
    adesola_profile = adesola_user.job_seeker_profile
    adesola_completed = db.query(Match).filter(
        Match.job_seeker_id == adesola_profile.id,
        Match.status == MatchStatus.completed,
    ).count()

    if adesola_completed == 0:
        past_time = utcnow() - timedelta(days=20)
        opp = Opportunity(
            trader_id=fatima_profile.id,
            title="Market helper · perishables",
            daily_pay=3000,
            duration_days=1,
            location="Mile 12 Market, Lagos",
            language_required="yoruba",
            skills_required=["selling", "carrying"],
            status=JobStatus.completed,
            created_at=past_time - timedelta(days=2),
        )
        db.add(opp); db.flush()
        match = Match(
            opportunity_id=opp.id,
            job_seeker_id=adesola_profile.id,
            match_score=79.0,
            match_reasoning="Close distance, Yoruba speaker, decent sales skills",
            engine_used="claude",
            status=MatchStatus.completed,
            trader_rating=4,
            trader_comment="Good worker, showed up on time",
            paid_at=past_time,
            completed_at=past_time,
            created_at=past_time - timedelta(days=1),
        )
        db.add(match)
        db.flush()
        print(f"  ✅ Adesola — 1 completed match seeded · ★4.0")
    else:
        print(f"  ⏭  Adesola already has {adesola_completed} completed match(es)")

    db.commit()

    # ── SUMMARY ───────────────────────────────────────────────────────────────

    print(f"""
✅ Seed v2 complete!

Demo accounts (all password: demo1234):

TRADERS:
  amaka@eko.demo    Fabric · Balogun Market   · credit eligible
  chidi@eko.demo    Tech retail · Comp Village · credit eligible
  fatima@eko.demo   Perishables · Mile 12      · below threshold
  biodun@eko.demo   Cosmetics · Balogun        · cold start

JOB SEEKERS:
  emeka@eko.demo    Surulere  · selling/yoruba  · 3 jobs ★4.8  (STRONG)
  adesola@eko.demo  Isale Eko · selling/yoruba  · 1 job  ★4.0  (BUILDING)
  ngozi@eko.demo    Yaba      · inventory/igbo  · 2 jobs ★4.5  (GOOD)
  taiwo@eko.demo    Agege     · loading/english · 0 jobs ★—    (NEW)

OPEN JOBS:
  Amaka  → Market sales assistant    ₦4,000/day  3 days  yoruba
  Chidi  → Electronics shop keeper  ₦3,500/day  5 days  english
  Fatima → Loading assistant         ₦3,000/day  2 days  pidgin

For the money shot demo:
  1. Login as any job seeker and apply to Amaka's job
  2. Login as Amaka → GET /match/opportunities/<id>/applicants
  3. See all 4 seekers ranked by Claude with work history in reasoning
    """)


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
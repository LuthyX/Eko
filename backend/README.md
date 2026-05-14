# Eko — Backend API

**Intelligent economic platform for informal traders and job seekers**
Squad Hackathon 3.0 · Challenge 2

---

## Quick start

### 1. Prerequisites
- Python 3.11+
- PostgreSQL 14+ (local or Supabase)

### 2. Clone and install

```bash
git clone <repo-url>
cd eko
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in DATABASE_URL, SECRET_KEY, and Squad credentials
```

Minimum required for local dev:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/eko_db
SECRET_KEY=any-long-random-string
```

### 4. Run

```bash
uvicorn app.main:app --reload
```

API docs available at: http://localhost:8000/docs

### 5. Test

```bash
pytest tests/test_phase1.py -v
```

> Tests use SQLite in-memory — no Postgres needed to run them.

---

## Project structure

```
app/
├── core/
│   ├── config.py       — env vars via pydantic-settings
│   ├── database.py     — SQLAlchemy engine + get_db dependency
│   └── security.py     — password hashing, JWT, role guards
├── models/
│   └── user.py         — ALL SQLAlchemy models (full schema)
├── schemas/
│   └── auth.py         — Pydantic request/response shapes
├── routers/
│   ├── auth.py         — /auth/* endpoints
│   ├── health.py       — /health
│   └── webhooks.py     — /webhooks/squad
├── services/           — business logic (Phase 2+)
└── main.py             — FastAPI app, CORS, router registration
```

---

## Phase 1 endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Service + DB health check |
| POST | `/auth/register` | — | Create account (trader/job_seeker/lender) |
| POST | `/auth/login` | — | Returns JWT |
| GET | `/auth/me` | JWT | Current user |
| POST | `/auth/verify-identity` | JWT | Submit BVN/NIN, stores tier |
| POST | `/auth/onboard/trader` | JWT (trader) | Create trader profile |
| GET | `/auth/onboard/trader/me` | JWT (trader) | Get trader profile |
| POST | `/auth/onboard/job-seeker` | JWT (job_seeker) | Create job seeker profile |
| GET | `/auth/onboard/job-seeker/me` | JWT (job_seeker) | Get job seeker profile |
| POST | `/webhooks/squad` | Sig | Squad event receiver |

---

## Key design decisions

**Identity tier, not identity data.** BVN and NIN are never stored. We record only the verification tier (none → bvn → nin → bvn_nin). This is what informs the EkoScore's 10% identity signal.

**Idempotency keys everywhere.** Every Squad disbursement gets a unique idempotency key generated before the API call. The webhook handlers check this key before processing — replays never double-pay.

**Role-based routing.** `require_role("trader")` is a FastAPI dependency factory. Adding it to any endpoint restricts access to that role in one line.

**Stub webhook handlers.** The Squad webhook receiver is live from Day 1 (Squad needs to be able to ping it), but the business logic handlers are clearly marked `[STUB]`. Phase 3 wires in the real repayment and payout logic.

---

## Adding Phase 2 routers

1. Create `app/routers/score.py`
2. Create `app/schemas/score.py`  
3. Create `app/services/ekoscore.py`
4. Register in `app/main.py`: `app.include_router(score.router)`

---

## Deployment (Railway)

```bash
# Railway reads this automatically
# Set env vars in Railway dashboard — same keys as .env.example
# Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

For production, switch `Base.metadata.create_all` in `main.py` to Alembic migrations:
```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```
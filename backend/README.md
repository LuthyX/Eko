# Eko Backend

> Intelligent economic platform for informal traders and job seekers — Squad Hackathon 3.0

Built with **FastAPI · PostgreSQL (Supabase) · Squad API · Claude (Anthropic) · scikit-learn · SHAP**

---

## What is Eko?

Eko gives informal market traders in Lagos access to financial services they've never had before — using their Squad transaction history as a financial identity.

**Three user types, three value propositions:**

| User | Problem | Eko solution |
|------|---------|--------------|
| **Trader** | No credit history → no loans | EkoScore from Squad data → EkoCredit advance |
| **Job seeker** | No way to find casual gigs | AI-matched to trader opportunities, paid via Squad |
| **Lender (MFB)** | Can't assess informal trader risk | SHAP-explained EkoScore portfolio dashboard |

---

## Table of contents

- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Demo accounts](#demo-accounts)
- [Running the demo](#running-the-demo)
- [API overview](#api-overview)
- [Endpoint reference](#endpoint-reference)
- [Architecture](#architecture)
- [Revenue model](#revenue-model)
- [Squad integration](#squad-integration)
- [Deployment](#deployment)

---

## Quick start

### Prerequisites

- Python 3.12+
- PostgreSQL (local or Supabase)
- ngrok (for Squad webhook testing)

### Install

```bash
git clone <repo-url>
cd backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Environment variables

Create `.env` in the `backend/` folder:

```env
# App
APP_NAME=Eko
ENVIRONMENT=development

# Database
DATABASE_URL=postgresql://...

# Auth
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Squad API
SQUAD_SECRET_KEY=sandbox_sk_xxxxxxxxxxxx
SQUAD_BASE_URL=https://sandbox-api-d.squadco.com
SQUAD_WEBHOOK_SECRET=your-webhook-secret
SQUAD_BENEFICIARY_ACCOUNT=your-gtbank-account-number

# Anthropic (Claude matching engine)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

### Run

```bash
uvicorn app.main:app --reload
```

Server: `http://localhost:8000`  
Swagger docs: `http://localhost:8000/docs`

### Seed demo data

```bash
python -m app.seeds.seed_demo_v2
```

---

## Demo accounts

All accounts use password: `demo1234`

### Traders

| Email | Business | Score | Notes |
|-------|----------|-------|-------|
| amaka@eko.demo | Amaka Fabrics · Balogun Market | ~67 | BVN+NIN · credit eligible |
| chidi@eko.demo | Chidi Tech Hub · Computer Village | ~68 | BVN · credit eligible |
| fatima@eko.demo | Fatima Fresh Foods · Mile 12 | ~58 | Below credit threshold |
| biodun@eko.demo | Biodun Beauty · Balogun | ~42 | Cold start |

### Job seekers

| Email | Location | Skills | History |
|-------|----------|--------|---------|
| emeka@eko.demo | Surulere | selling · yoruba | 3 jobs · ★4.8 |
| adesola@eko.demo | Isale Eko | selling · yoruba | 1 job · ★4.0 |
| ngozi@eko.demo | Yaba | inventory · igbo | 2 jobs · ★4.5 |
| taiwo@eko.demo | Agege | loading · english | New |

### Lender

| Email | Institution |
|-------|-------------|
| lender@eko.demo | FirstChoice MFB |

---

## Running the demo

### Option A — Automated simulation script

Runs the entire flow end to end, simulates Squad webhooks, prints results:

```bash
python simulate_demo.py
```

### Option B — Manual via Swagger

Open `http://localhost:8000/docs` and follow this flow:

**Trader flow:**
1. `POST /auth/login` → amaka@eko.demo
2. `GET /wallet/me` → see real GTBank VA number
3. `GET /score/{trader_id}` → EkoScore + SHAP breakdown
4. `GET /credit/eligibility` → check advance offer
5. `POST /credit/apply` → get ₦180,000 advance
6. `POST /match/opportunities` → post a job

**Job seeker flow:**
7. `POST /auth/login` → emeka@eko.demo
8. `GET /match/opportunities` → browse open jobs
9. `POST /match/opportunities/{id}/apply` → **Claude scores live ⭐**

**Back to trader:**
10. `GET /match/opportunities/{id}/applicants` → **ranked list with AI reasoning ⭐**
11. `POST /match/applications/{id}/accept` → accept Emeka
12. `POST /match/applications/{id}/complete` → pay Emeka

**Simulate Squad webhook:**
13. `POST /webhooks/squad` → confirm payout
14. `GET /wallet/me` (Emeka) → see ₦12,000 credited

**Lender flow:**
15. `POST /auth/login` → lender@eko.demo
16. `GET /lender/portfolio` → full portfolio overview
17. `GET /lender/traders/{id}` → SHAP breakdown per trader

---

## API overview

### Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

Get token via `POST /auth/login`. Expires after 60 minutes.

### Roles

| Role | Access |
|------|--------|
| `trader` | EkoScore, EkoCredit, wallet, job posting, applicant review |
| `job_seeker` | Browse jobs, apply, earnings wallet |
| `lender` | Read-only portfolio monitoring |

---

## Endpoint reference

### Auth `prefix: /auth`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | Login → JWT token |
| GET | `/me` | All | Current user profile |
| POST | `/verify-identity` | trader/seeker | Submit BVN/NIN |
| POST | `/onboard/trader` | trader | Trader profile + wallet provision |
| GET | `/onboard/trader/me` | trader | Get trader profile |
| POST | `/onboard/job-seeker` | job_seeker | Seeker profile + wallet provision |
| GET | `/onboard/job-seeker/me` | job_seeker | Get seeker profile |

### EkoScore `prefix: /score`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/{trader_id}` | All | Latest score + SHAP breakdown |
| POST | `/compute/{trader_id}` | All | Trigger fresh computation |
| GET | `/{trader_id}/history` | All | Score over time (chart data) |
| GET | `/cohort/{category}` | All | Category median stats |
| POST | `/cold-start/{trader_id}` | All | Assign cold-start baseline |

### Wallet `prefix: /wallet`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/me` | All | Balance + virtual account details |
| GET | `/me/transactions` | All | Transaction ledger |
| POST | `/withdraw` | All | Withdraw to bank via Squad |

### EkoCredit & EkoSave `prefix: /credit, /save`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/credit/eligibility` | trader | Check eligibility + advance offer |
| POST | `/credit/apply` | trader | Apply for advance |
| GET | `/credit/loan/active` | trader | Active loan + repayment progress |
| GET | `/credit/loan/history` | trader | All past loans |
| POST | `/credit/loan/repay` | trader | Manual repayment from wallet |
| GET | `/credit/loan/{id}/repayments` | trader | Repayment history |
| POST | `/save/enroll` | trader | Enroll in EkoSave |
| GET | `/save/me` | trader | EkoSave balance + sweep % |

### Job matching `prefix: /match`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/opportunities` | trader | Post a job |
| GET | `/opportunities` | All | Browse open jobs |
| GET | `/opportunities/mine` | trader | Trader's own postings |
| GET | `/opportunities/{id}` | All | Single opportunity detail |
| POST | `/opportunities/{id}/apply` | job_seeker | Apply → Claude scores instantly |
| GET | `/opportunities/{id}/applicants` | trader | ⭐ Ranked applicants with AI reasoning |
| POST | `/applications/{id}/accept` | trader | Accept one → auto-decline others |
| POST | `/applications/{id}/complete` | trader | Mark done → Squad pays seeker |
| GET | `/applications/{id}` | All | Single application detail |
| GET | `/applications/mine` | job_seeker | Seeker's applications |
| POST | `/applications/{id}/rate` | trader/seeker | Rate after completion |
| GET | `/seekers/{id}/profile` | All | Seeker reliability profile |

### Lender `prefix: /lender`

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/portfolio` | lender | Portfolio stats + all traders |
| GET | `/traders/{trader_id}` | lender | Trader detail + SHAP + loans |

### Webhooks `prefix: /webhooks`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/squad` | Squad event receiver (charge.success · transfer.success · transfer.failed) |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server + DB status check |

---

## Architecture

### Money flow — best practice

All outbound transfers follow a two-step webhook-confirmed pattern:

```
Initiation:
  Sender wallet debited immediately
  Squad transfer initiated
  Return "processing" to UI

Confirmation (Squad webhook):
  transfer.success → credit receiver wallet
  transfer.failed  → refund sender wallet automatically
```

This prevents phantom balances. No money appears in a receiver's wallet until Squad confirms the transfer.

Inbound payments (`charge.success`) credit immediately — the money is already confirmed in Squad's system.

### EkoScore signals

| Signal | Weight | Source |
|--------|--------|--------|
| Transaction volume | 30% | Squad 90-day receipts (log-scaled) |
| Tenure & recency | 25% | Days since first + last transaction |
| Cohort comparison | 20% | vs peers in same business category |
| Behavioural stability | 15% | Isolation Forest anomaly detection |
| Identity tier | 10% | BVN / NIN verification level |

Minimum score for EkoCredit: **60**. Cold-start traders capped at 55.

### Matching engine priority

```
Claude (primary)
  ↓ fails (no API key / timeout)
sentence-transformers cosine similarity (fallback — local)
  ↓ fails (not installed)
Rule-based skill/language/pay scoring (always works)
```

Claude's prompt is enriched with seeker work history:
```
"Emeka: 3 jobs completed · avg rating 4.8/5★ · 100% completion rate"
```
This is the learning loop — every completed job makes future matching smarter.

### Learning loop

```
Job completes → wage payout confirmed by Squad webhook
    ↓
seeker.jobs_completed += 1
seeker.avg_rating recomputed from all rated matches
    ↓
Next Claude prompt includes work history
    ↓
Traders see: "4.8★ rating from 3 completed jobs"
```

---

## Revenue model

### EkoCredit origination fee
- Flat **5%** charged on every advance
- Trader borrows ₦180,000 → repays ₦189,000
- `Loan.fee_amount` tracks Eko's revenue per loan
- Lender gets principal back, Eko keeps the fee

### Job platform fee
- **5%** charged to trader on top of wage when marking job complete
- ₦12,000 job → trader pays ₦12,600
- Job seeker receives full ₦12,000 — no deduction
- `Opportunity.platform_fee_amount` tracks per-job revenue

---

## Squad integration

### What's working in sandbox

| Feature | Status |
|---------|--------|
| Secret key auth | ✅ |
| Virtual account creation | ✅ Real GTBank VAs for all 8 demo accounts |
| Account lookup | ✅ |
| Transfer API (outbound) | ✅ Endpoint reachable |
| Webhook receiver | ✅ Correct header + HMAC-SHA512 |
| Inbound payment simulation | ✅ Via charge.success webhook |
| Outbound transfer simulation | ✅ Via transfer.success webhook |
| Ledger balance | ₦0 — sandbox account not funded |

### Why transfers are simulated

Squad sandbox ledger has ₦0 balance — outbound transfers (credit disbursements + wage payouts) fail with "insufficient balance". The webhook handler simulates these in development. In production with a funded account everything fires automatically.

### Virtual account details

All 8 demo accounts have real GTBank virtual account numbers provisioned via Squad's API:

```
amaka@eko.demo  → 7553874718 (GTBank)
chidi@eko.demo  → 5294829343 (GTBank)
fatima@eko.demo → 9122838836 (GTBank)
emeka@eko.demo  → 1499469873 (GTBank)
adesola@eko.demo → 3244382231 (GTBank)
taiwo@eko.demo  → 2672779629 (GTBank)
ngozi@eko.demo  → 7168322339 (GTBank)
biodun@eko.demo → 1936356756 (GTBank)
```

### Webhook events handled

**`charge.success` / virtual account receipt:**
- Identifies trader by `customer_identifier`
- Credits internal wallet
- Sweeps loan repayment %
- Sweeps EkoSave %

**`transfer.success`:**
- `CREDIT_*` prefix → credits trader wallet (EkoCredit confirmed)
- `WAGE_*` prefix → credits job seeker wallet (wage payout confirmed) + updates learning loop

**`transfer.failed`:**
- `WAGE_*` → refunds trader wallet automatically
- `CREDIT_*` → marks loan as failed for manual review

### Going to production

1. Switch `SQUAD_BASE_URL` to `https://api-d.squadco.com`
2. Fund Squad merchant account
3. Set real `SQUAD_BENEFICIARY_ACCOUNT` (GTBank)
4. Set `SQUAD_WEBHOOK_SECRET` from dashboard
5. Set ngrok URL → production domain in Squad webhook settings
6. Change `ENVIRONMENT=production` in `.env`

---

## Deployment

### Railway (recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Set environment variables in Railway dashboard — same as `.env` file.

Railway auto-detects FastAPI and runs:
```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Add a `Procfile` in backend root:
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Database

Using Supabase PostgreSQL. Connection string format:
```
postgresql://postgres:[password]@[host]:5432/postgres
```

Tables are auto-created on first startup via `Base.metadata.create_all()`.

---

## Project structure

```
backend/
├── app/
│   ├── core/
│   │   ├── config.py         Settings + env vars
│   │   ├── database.py       SQLAlchemy engine + session
│   │   └── security.py       JWT + password hashing
│   ├── models/
│   │   ├── user.py           All domain models
│   │   └── wallet.py         Wallet + transaction ledger
│   ├── routers/
│   │   ├── auth.py           Auth + onboarding
│   │   ├── credit.py         EkoCredit + EkoSave + wallet
│   │   ├── health.py         Health check
│   │   ├── lender.py         Lender portfolio monitoring
│   │   ├── match.py          Job matching (Phase 4 + 5b)
│   │   ├── score.py          EkoScore
│   │   └── webhooks.py       Squad webhook receiver
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── credit.py
│   │   ├── match.py
│   │   └── score.py
│   ├── services/
│   │   ├── credit.py         EkoCredit + EkoSave logic
│   │   ├── ekoscore.py       ML scoring engine
│   │   ├── feedback.py       Learning loop
│   │   ├── matching.py       Claude + fallback matching
│   │   ├── squad.py          Squad API client
│   │   └── wallet.py         Ledger operations
│   ├── seeds/
│   │   ├── seed_traders.py   Original seed (Phase 1–3)
│   │   └── seed_demo_v2.py   Full demo seed (Phase 4–5)
│   └── main.py               FastAPI app + router registration
├── simulate_demo.py          End-to-end demo simulation script
├── verify_squad.py           Squad sandbox verification script
├── requirements.txt
└── README.md
```

---

## What's next (post-hackathon)

- **Background jobs** — APScheduler daily EkoScore recompute for all active traders
- **Insurance products** — microinsurance unlocked at EkoScore ≥ 75
- **Push notifications** — Firebase for job acceptance + payout alerts  
- **Lender approval flow** — Model A marketplace lending (optional)
- **NIN verification** — real NIMC API integration
- **Production Squad** — switch from sandbox, fund merchant account
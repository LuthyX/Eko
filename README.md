# Eko — Where Your Hustle Echoes

> An intelligent economic platform connecting informal traders, job seekers, and financial services in Lagos, Nigeria.
>
> Built for **Squad Hackathon 3.0** — Challenge 02: *Smart Systems: The Intelligent Economy*

---

## What is Eko?

Nigeria has over 60 million informal workers. Amaka sells ₦500k in fabric monthly at Balogun Market but has no credit score. Emeka is a skilled graduate who has been unemployed for 8 months. Traditional financial systems ignore both of them.

Eko gives them a financial identity — and connects them to each other.

Three products, one platform:

| Product | What it does |
|---------|-------------|
| **EkoScore** | AI-powered financial identity built from Squad transaction history. 5 signals, SHAP-explained, risk-tiered. |
| **EkoCredit** | Working capital for traders. Scored, disbursed via Squad VA, repaid automatically through incoming payment sweeps. |
| **EkoMatch** | Claude AI matches job seekers to trader opportunities in real time. Skills, language, location, work history — all factored in. |

---

## Repository Structure

```
eko/
├── backend/          # FastAPI + SQLAlchemy + Supabase (PostgreSQL)
│   ├── app/
│   │   ├── routers/  # auth, score, credit, match, lender, webhooks
│   │   ├── models/   # SQLAlchemy ORM models
│   │   ├── schemas/  # Pydantic request/response schemas
│   │   ├── services/ # Business logic — ekoscore, credit, matching, wallet
│   │   └── seeds/    # Demo data seeding scripts
│   ├── reset_loans.py        # Dev utility: clear loans + seed test balances
│   └── README.md
│
├── frontend/         # React + TypeScript + Vite PWA
│   ├── src/
│   │   ├── pages/    # trader/, seeker/, auth/ screens
│   │   ├── components/
│   │   ├── api/      # Axios client — all backend endpoints
│   │   ├── context/  # AuthContext (Zustand-backed)
│   │   └── types/    # TypeScript types matching backend schemas
│   └── README.md
│
└── README.md         # ← you are here
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (or a Supabase project)
- A Squad sandbox account — [sandbox.squadco.com](https://sandbox.squadco.com)
- An Anthropic API key — [console.anthropic.com](https://console.anthropic.com)

### 1. Clone the repo

```bash
git clone https://github.com/your-team/eko.git
cd eko
```

### 2. Start the backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Fill in your values — see Environment Variables section below

# Seed demo data
python -m app.seeds.seed_demo_v2

# Start the API server
uvicorn app.main:app --reload --port 8000
```

API runs at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### 3. Start the frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server (proxies /api → localhost:8000)
npm run dev
```

App runs at `http://localhost:3000`

---

## Environment Variables

Create `backend/.env` with the following:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/eko

# Auth
SECRET_KEY=your-secret-key-here-make-it-long-and-random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Squad API (get from sandbox.squadco.com)
SQUAD_SECRET_KEY=sandbox_sk_...
SQUAD_BASE_URL=https://sandbox-api-d.squadco.com
SQUAD_WEBHOOK_SECRET=your-webhook-secret
SQUAD_BENEFICIARY_ACCOUNT=your-gtbank-account-number

# Anthropic (for Claude AI matching)
ANTHROPIC_API_KEY=sk-ant-...

# Environment
ENVIRONMENT=development
```

To switch to production:
- Set `ENVIRONMENT=production`
- Set `SQUAD_BASE_URL=https://api-d.squadco.com`
- Use your live Squad secret key
- Switch to your production database URL

---

## Demo Accounts

All accounts use password `demo1234`.

### Traders

| Email | Business | EkoScore | Status |
|-------|----------|----------|--------|
| `amaka@eko.demo` | Amaka Fabrics · Balogun Market | ~74 | Credit eligible |
| `chidi@eko.demo` | Chidi Tech Hub · Computer Village | ~68 | Credit eligible |
| `fatima@eko.demo` | Fatima Fresh Foods · Mile 12 | ~58 | Below threshold |
| `biodun@eko.demo` | Biodun Beauty · Balogun Market | ~42 | Cold start |

### Job Seekers

| Email | Location | Skills | History |
|-------|----------|--------|---------|
| `emeka@eko.demo` | Surulere | selling, carrying, Yoruba | 3 jobs · ★4.8 |
| `adesola@eko.demo` | Isale Eko | selling, cashier, Yoruba | 1 job · ★4.0 |
| `ngozi@eko.demo` | Yaba | inventory, cashier, Igbo | 2 jobs · ★4.5 |
| `taiwo@eko.demo` | Agege | loading, delivery | New |

---

## Key User Flows

### Trader — EkoCredit

```
Register → link Squad merchant account
  → EkoScore computed from transaction history
    → credit offer unlocked (score ≥ 60)
      → apply via slider → funds in wallet via Squad VA
        → repaid automatically: X% of every incoming payment swept
          → manual repayment also available anytime
```

### Trader — EkoMatch (hiring)

```
Post a job (title, daily pay, duration, skills, language)
  → job seekers apply
    → Claude Sonnet scores each applicant in real time
      → ranked list shown to trader (highest match first)
        → trader views applicant reliability profile
          → accepts one → contact details revealed
            → mark job complete → Squad pays worker wage instantly
              → rate the worker
```

### Job Seeker

```
Register → set skills, languages, location, daily rate
  → browse job feed → apply to job
    → Claude match score returned instantly (0–100 + reasoning)
      → if accepted: see trader contact details
        → show up → job completed → wage deposited to Eko wallet
          → withdraw to any Nigerian bank account
            → rate the trader
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (PWA)                        │
│           React · TypeScript · Vite · Sora font          │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS / REST
┌───────────────────────▼─────────────────────────────────┐
│                  Backend (FastAPI)                        │
│                                                           │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  │
│  │EkoScore │  │EkoCredit │  │EkoMatch │  │ Lender   │  │
│  │ML engine│  │loan flow │  │Claude AI│  │dashboard │  │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └──────────┘  │
│       └────────────┴─────────────┘                       │
│                    │                                      │
│  ┌─────────────────▼──────────────────────────────────┐  │
│  │              Squad API Layer                        │  │
│  │  Virtual Accounts · Payouts · Webhooks · Tx History │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │           PostgreSQL (Supabase)                    │   │
│  │  Users · Wallets · Loans · Matches · EkoScores    │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**AI stack:**
- **EkoScore** — Scikit-learn Isolation Forest (behavioural stability) + Logistic Regression (risk tiers) + SHAP explainability
- **EkoMatch** — Claude Sonnet (`claude-sonnet-4-20250514`) called synchronously on every job application. Fallback: sentence-transformers cosine similarity → rule-based scoring.

---

## Squad API Integration

Eko uses Squad as its entire financial infrastructure — not as a payment bolt-on.

| Squad feature | How Eko uses it |
|--------------|----------------|
| `POST /virtual-account` | Every user (trader + seeker) gets a dedicated NUBAN on signup |
| `POST /payout/transfer` | EkoCredit disbursements and job seeker wage payments |
| `charge.success` webhook | Triggers wallet credit, auto loan repayment sweep, EkoScore signal |
| `GET /transaction/query` | Pulls real merchant transaction history to compute EkoScore |

---

## Development Utilities

### Reset loans (for demo/testing)

```bash
cd backend

# Preview what will be deleted
python reset_loans.py --dry-run

# Reset all traders + seed ₦500k test balance per wallet
python reset_loans.py --seed-balance

# Reset a specific account only
python reset_loans.py --email amaka@eko.demo --seed-balance
```

### Re-seed demo data

```bash
cd backend
python -m app.seeds.seed_demo_v2
```

### Switch to Railway (production backend)

```bash
cd frontend
VITE_API_URL=https://your-app.railway.app npm run build
```

---

## Hackathon Notes

**Challenge:** Squad Hackathon 3.0 — Challenge 02
**Theme:** Smart Systems: The Intelligent Economy
**Team:** Eko

**Judging criteria addressed:**

| Criterion | Weight | How Eko addresses it |
|-----------|--------|---------------------|
| Squad API Integration | 25% | VA creation, payouts, webhooks, tx history — all core to the product |
| Technical Architecture | 20% | FastAPI + ML pipeline + Claude AI + PostgreSQL + PWA |
| Problem Understanding & Innovation | 20% | EkoScore uses alternative data (Squad tx history) not credit history |
| Economic Viability & Scalability | 20% | 5% fees on credit + jobs, data flywheel, horizontal scale via Railway |
| Presentation & Communication | 15% | Working live demo + pitch deck |
| Impact Potential (bonus) | 10% | 60M+ informal workers addressable market, 3-phase rollout plan |

---

## License

MIT — see LICENSE file.
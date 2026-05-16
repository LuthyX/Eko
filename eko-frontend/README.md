# Eko Frontend

Production-ready PWA for Eko — the intelligent economic platform for Lagos informal traders and job seekers.

## Stack
- React 18 + TypeScript + Vite
- PWA via vite-plugin-pwa (installable, offline-capable)
- Sora + JetBrains Mono fonts
- Recharts for score history charts
- Framer Motion ready
- Zustand + Axios

## Quick start

```bash
npm install
npm run dev        # starts on http://localhost:3000
npm run build      # production build
```

The dev server proxies `/api` → `http://localhost:8000` automatically.

To point at a different backend:
```bash
VITE_API_URL=https://eko-api.railway.app npm run dev
```

## Demo accounts (password: demo1234)

| Email | Role |
|-------|------|
| amaka@eko.demo | trader · score ~74 · credit eligible |
| chidi@eko.demo | trader · score ~68 · credit eligible |
| fatima@eko.demo | trader · score ~58 · below threshold |
| biodun@eko.demo | trader · cold start |
| emeka@eko.demo | job seeker · 3 jobs ★4.8 |

## Pages built

### Trader
- `/trader` — Home dashboard (wallet, EkoScore ring, credit offer, active loan, jobs)
- `/trader/score` — EkoScore detail with SHAP breakdown + history chart
- `/trader/credit` — EkoCredit eligibility, apply slider, loan tracker, repayments
- `/trader/jobs` — All posted jobs with status filters
- `/trader/jobs/new` — Post a job form
- `/trader/jobs/:id/applicants` — **The money shot** — Claude AI ranked applicants
- `/trader/wallet` — Balance, VA copy, transaction ledger, EkoSave enroll
- `/trader/profile` — Business info, identity verification

### Job Seeker
- `/seeker` — Job feed with search + match scores
- `/seeker/jobs/:id` — Job detail + apply → Claude match score shown instantly
- `/seeker/applications` — All applications with status tracking
- `/seeker/earnings` — Wallet + transaction history
- `/seeker/profile` — View/edit skills, languages, rate

## Missing backend endpoints (suggested)
1. `PATCH /auth/onboard/job-seeker/me` — update seeker profile (currently re-POSTs)
2. `GET /match/opportunities/:id` returns `OpportunityResponse` not `OpportunityFeedItem` — seeker job detail page needs `already_applied` and `my_match_score`, so it calls `GET /match/opportunities` (list) and finds by ID. A dedicated `GET /match/opportunities/:id/seeker-view` would be cleaner.
3. `GET /match/applications/mine` doesn't return opportunity title — consider enriching with `opportunity_title` field on `MatchResponse`.

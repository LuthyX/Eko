# Eko — Job Seeker App

The seeker-facing half of [Eko](../README.md), built for **Squad Hackathon 3.0 · Challenge 2**: _Smart Systems — The Intelligent Economy_.

A mobile-first React app that lets unemployed and gig-working Nigerians find short-term work near them, get AI-matched to nearby traders, and receive wages directly into a Squad-provisioned virtual account.

## What it does

- Sign up + onboard with skills, location, language preferences
- Browse open job opportunities posted by traders nearby
- Apply with one tap → Claude scores fit in real time and explains why
- Track every application by status (pending → accepted → paid)
- See total earnings, transaction history, and the virtual bank account traders pay you to

## Tech

- **React 19** + **Vite**
- **React Router 7** for routing + protected routes
- **Tailwind CSS** for styling (custom design tokens, no UI kit)
- **Axios** with a global 401 interceptor + JWT auth
- JWT stored in `localStorage`, auto-cleared on session expiry

## Quick start

```bash
# Prerequisites: Node.js 18+, and the Eko backend running on http://localhost:8000

cd jobseeker-app
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Demo accounts

The backend seeds these for the demo. All use password `demo1234`:

| Email            | Role       | Notes                                                    |
| ---------------- | ---------- | -------------------------------------------------------- |
| `emeka@eko.demo` | job_seeker | Lives in Surulere · the demo character                   |
| `amaka@eko.demo` | trader     | Posts the job Emeka applies to (lives in the trader app) |

## Screens

| Route         | Screen            | What it does                                                                      |
| ------------- | ----------------- | --------------------------------------------------------------------------------- |
| `/auth`       | Login / Register  | JWT auth, hardcoded to job_seeker role                                            |
| `/onboarding` | Skills + location | One-time profile setup; auto-skips for returning users                            |
| `/home`       | Dashboard         | Time-aware greeting, animated earnings hero, stats grid, recent activity          |
| `/jobs`       | Browse jobs       | Live feed of opportunities · apply with inline Claude reasoning                   |
| `/profile`    | My applications   | Tracker for every job applied to, with status pills + match scores                |
| `/earnings`   | Earnings          | Total earned (count-up animation) + transaction history + virtual account details |

## Folder layout

```
src/
├── api/
│   └── client.js              # Axios + auth interceptors + logout() helper
├── components/
│   ├── AuthPage.jsx
│   ├── BottomNav.jsx          # 4-tab nav: Home · Jobs · Apps · Earnings
│   ├── EarningsPage.jsx
│   ├── HomePage.jsx
│   ├── JobSeekerOnboarding.jsx
│   ├── JobsNearYouPage.jsx
│   ├── MyApplications.jsx
│   └── Skeleton.jsx           # Shared loading placeholder
├── App.jsx                    # Routes + global auth state
└── main.jsx                   # Vite entry
```

## Architecture notes

**Session handling.** The axios client (`src/api/client.js`) attaches the JWT to every request and intercepts 401 responses globally — clearing the token and bouncing to `/auth`. No stuck sessions, no half-logged-in states.

**Wallet provisioning.** Immediately after successful login, the app calls `GET /wallet/me` to ensure the backend has provisioned the user's wallet + Squad virtual account before any money operation runs.

**Match scoring.** When the seeker applies to a job, the backend runs Claude synchronously and returns the match score + reasoning in the apply response. The frontend renders this inline with a count-up animation on the score — the "94% match!" moment is shown immediately, not buried in a follow-up screen.

**Resilient by design.** Skeleton loaders for every async state, smooth fade-in for success banners, graceful empty states with clear next-steps, and the app still works (just shows placeholders) when individual backend endpoints fail.

## Demo flow — the Emeka journey

This app is one half of the two-character demo story:

1. **Emeka** opens the app, signs up, fills onboarding → lands on his dashboard
2. He taps **Jobs** → sees Amaka's "Market sales assistant" posting
3. He taps **Apply now** → Claude scores him in ~1s → success banner reveals **94% match** with reasoning
4. _(Meanwhile in the trader app: Amaka sees Emeka ranked first → accepts him → later marks the job complete)_
5. Emeka taps **Earnings** → sees **₦12,000** counted up to total earned
6. Below the hero card: his payout account (Wema Bank · `0764653503`) and the transaction row showing Squad's reference code

## Related

- [`backend/`](../backend) — FastAPI · Squad API · Claude API · EkoScore ML
- [`trader-app/`](../trader-app) — React app for traders + lender dashboard

---

Built by the Eko team for Squad Hackathon 3.0

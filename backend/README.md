# Eko Frontend API Documentation

**Base URL:** `http://localhost:8000` (dev) · `https://eko-api.railway.app` (prod)  
**Interactive docs:** `http://localhost:8000/docs`  
**Version:** 0.2.0 · Squad Hackathon 3.0

---

## Quick start for frontend

### 1. Install and run the backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 2. Get a token

Every protected request needs a Bearer token in the `Authorization` header.

```js
// Login
const res = await fetch('http://localhost:8000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'amaka@eko.demo', password: 'demo1234' })
})
const { access_token, role, user_id } = await res.json()

// Use on every subsequent request
const headers = {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
}
```

### 3. Demo accounts (all use password `demo1234`)

| Email | Role | EkoScore | Notes |
|-------|------|----------|-------|
| amaka@eko.demo | trader | 67 | Fabric stall · credit eligible |
| chidi@eko.demo | trader | 68 | Tech retail · credit eligible |
| fatima@eko.demo | trader | 58 | Below credit threshold |
| biodun@eko.demo | trader | 42 | Cold start |
| emeka@eko.demo | job_seeker | — | Market sales skills · Surulere |

---

## Three user types

Every screen maps to one of three roles. The token's role determines what endpoints are accessible.

```
trader      → home dashboard, EkoScore, wallet, EkoCredit, post jobs, review applicants
job_seeker  → browse jobs, apply, track applications, earnings wallet
lender      → read-only score + portfolio views (Phase 5)
```

---

## Auth & onboarding

### Register `POST /auth/register`

**Screen:** Register screen  
**Roles:** Public

```js
const body = {
  email: "amaka@example.com",
  password: "securepass123",
  full_name: "Amaka Okonkwo",
  phone: "08011111111",        // optional
  role: "trader"               // "trader" | "job_seeker" | "lender"
}
```

**Response `201`:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "role": "trader",
  "user_id": 1
}
```

**Errors:**
- `409` — Email already registered

---

### Login `POST /auth/login`

**Screen:** Login screen  
**Roles:** Public

```js
const body = {
  email: "amaka@eko.demo",
  password: "demo1234"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "role": "trader",
  "user_id": 3
}
```

**Errors:**
- `401` — Invalid email or password
- `403` — Account disabled

> Store `access_token` and `role` in your auth state. Token expires after 60 minutes.

---

### Current user `GET /auth/me`

**Screen:** Any screen needing user info  
**Roles:** All

```json
{
  "id": 3,
  "email": "amaka@eko.demo",
  "full_name": "Amaka Okonkwo",
  "role": "trader",
  "identity_tier": "bvn_nin",
  "is_active": true
}
```

Identity tier values: `none` · `bvn` · `nin` · `bvn_nin`

---

### Verify identity `POST /auth/verify-identity`

**Screen:** Identity verification screen (onboarding step 3)  
**Roles:** trader, job_seeker

```js
const body = {
  bvn: "22343211654",   // 11 digits — stored as tier only, never raw number
  nin: null             // optional
}
```

**Response:** Updated user object with new `identity_tier`

> At least one of `bvn` or `nin` required. Both = `bvn_nin` tier (highest score bonus).

---

### Trader onboarding `POST /auth/onboard/trader`

**Screen:** Trader onboarding screen  
**Roles:** trader

```js
const body = {
  business_name: "Amaka Fabrics",
  business_category: "fabric",    // fabric | tech_retail | perishables | cosmetics | electronics
  market_location: "Balogun Market, Lagos Island",
  squad_merchant_id: null         // optional — link Squad merchant account
}
```

**Response `200`:**
```json
{
  "id": 1,
  "user_id": 3,
  "business_name": "Amaka Fabrics",
  "business_category": "fabric",
  "market_location": "Balogun Market, Lagos Island",
  "squad_merchant_id": null,
  "squad_linked": false
}
```

> Automatically provisions wallet + virtual account on creation.

---

### Get trader profile `GET /auth/onboard/trader/me`

**Screen:** Home dashboard, settings  
**Roles:** trader

Returns same shape as onboarding response above.

---

### Job seeker onboarding `POST /auth/onboard/job-seeker`

**Screen:** Job seeker onboarding screen  
**Roles:** job_seeker

```js
const body = {
  skills: ["selling", "carrying", "customer service", "cashier"],
  languages: ["yoruba", "english", "pidgin"],
  location: "Surulere, Lagos",
  daily_rate_expectation: 4000    // NGN per day — optional
}
```

**Response `200`:**
```json
{
  "id": 1,
  "user_id": 7,
  "skills": ["selling", "carrying", "customer service", "cashier"],
  "languages": ["yoruba", "english", "pidgin"],
  "location": "Surulere, Lagos",
  "daily_rate_expectation": 4000
}
```

---

### Get job seeker profile `GET /auth/onboard/job-seeker/me`

**Screen:** Seeker profile screen  
**Roles:** job_seeker

---

## EkoScore

### Get latest score `GET /score/{trader_id}`

**Screen:** Home dashboard (score card), EkoScore detail screen  
**Roles:** All authenticated

```json
{
  "id": 12,
  "trader_id": 1,
  "score": 67.15,
  "risk_tier": "A",
  "is_cold_start": false,
  "computed_at": "2026-05-14T09:00:00Z",
  "transaction_volume_score": 85.4,
  "tenure_recency_score": 78.1,
  "cohort_comparison_score": 62.0,
  "behavioural_stability_score": 70.5,
  "identity_tier_score": 80.0,
  "shap_values": {
    "transaction_volume": {
      "shap_value": 0.142,
      "weight": 0.30,
      "label": "Transaction Volume"
    },
    "tenure_recency": {
      "shap_value": 0.098,
      "weight": 0.25,
      "label": "Tenure & Recency"
    },
    "cohort_comparison": {
      "shap_value": 0.071,
      "weight": 0.20,
      "label": "Cohort Comparison"
    },
    "behavioural_stability": {
      "shap_value": 0.052,
      "weight": 0.15,
      "label": "Behavioural Stability"
    },
    "identity_tier": {
      "shap_value": 0.040,
      "weight": 0.10,
      "label": "Identity Tier"
    }
  },
  "credit_eligible": true,
  "max_advance_ngn": 335750
}
```

**How to use `shap_values` for the score breakdown bars:**
```js
// Each signal has weight (its proportion of total score)
// Use weight × 100 as the bar fill percentage
const signals = Object.entries(score.shap_values).map(([key, val]) => ({
  label: val.label,
  percentage: val.weight * 100,    // bar fill %
  contribution: val.shap_value,    // raw SHAP contribution
}))
// Renders: "Transaction Volume" → 30% bar, etc.
```

**Risk tier values:** `A` · `B` · `C` · `unscored`

**`credit_eligible`** → `true` when score ≥ 60 and not cold start. Use this to show/hide the EkoCredit offer card.

**`max_advance_ngn`** → Use as the maximum value for the credit apply slider.

---

### Score history `GET /score/{trader_id}/history`

**Screen:** Score chart (Recharts line chart)  
**Roles:** All authenticated

```
GET /score/1/history?limit=30
```

```json
[
  {
    "score": 67.15,
    "risk_tier": "A",
    "is_cold_start": false,
    "computed_at": "2026-05-14T09:00:00Z"
  },
  {
    "score": 64.2,
    "risk_tier": "A",
    "is_cold_start": false,
    "computed_at": "2026-05-07T09:00:00Z"
  }
]
```

Ordered most recent first. Use `computed_at` as x-axis, `score` as y-axis.

---

## Wallet

> **Important:** Call `GET /wallet/me` immediately after login to ensure the wallet is provisioned before any money operations.

### Get wallet `GET /wallet/me`

**Screen:** Wallet screen, home dashboard (balance)  
**Roles:** All authenticated

```json
{
  "id": 1,
  "user_id": 3,
  "balance_kobo": 55520000,
  "balance_naira": 555200.0,
  "virtual_account_number": "0764653503",
  "virtual_bank_name": "Wema Bank",
  "virtual_account_name": "EKO/AMAKA OKONKWO",
  "is_active": true
}
```

> Always display `balance_naira` — never use `balance_kobo` directly in the UI.

---

### Transaction history `GET /wallet/me/transactions`

**Screen:** Wallet ledger screen, earnings history  
**Roles:** All authenticated

```
GET /wallet/me/transactions?limit=50
```

```json
[
  {
    "id": 42,
    "tx_type": "credit_payment_received",
    "amount_kobo": 2400000,
    "amount_naira": 24000.0,
    "direction": "credit",
    "balance_after_naira": 567800.0,
    "status": "completed",
    "squad_reference": "VA_REF123",
    "description": "Payment received ₦24,000.00 via virtual account",
    "created_at": "2026-05-14T09:42:00Z"
  }
]
```

**Transaction type → UI mapping:**

| tx_type | Direction | Icon | Colour |
|---------|-----------|------|--------|
| `credit_payment_received` | credit | ↙ | green |
| `credit_loan_disbursement` | credit | 💼 | green |
| `credit_wage_received` | credit | ↙ | green |
| `debit_loan_repayment` | debit | ↗ | red |
| `debit_ekosave_sweep` | debit | 🐷 | neutral |
| `debit_wage_payout` | debit | 💼 | red |
| `debit_withdrawal` | debit | ↗ | red |

---

### Withdraw `POST /wallet/withdraw`

**Screen:** Wallet screen → withdraw modal  
**Roles:** All authenticated

```js
const body = {
  amount_naira: 50000,
  bank_code: "000013",          // GTBank — see bank codes below
  account_number: "0123456789", // 10 digits
  account_name: "Amaka Okonkwo"
}
```

**Common bank codes:**

| Bank | Code |
|------|------|
| GTBank | 000013 |
| Access Bank | 000014 |
| Zenith Bank | 000015 |
| First Bank | 000016 |
| UBA | 000004 |
| Wema Bank | 000017 |
| Kuda | 090267 |
| OPay | 100004 |
| PalmPay | 100033 |
| Moniepoint | 090405 |

**Response:**
```json
{
  "reference": "WITHDRAW_ABC123",
  "amount_naira": 50000,
  "status": "processing"
}
```

---

## EkoCredit

### Check eligibility `GET /credit/eligibility`

**Screen:** Home dashboard (show/hide credit offer card), credit offer screen  
**Roles:** trader

```json
{
  "eligible": true,
  "score": 67.15,
  "risk_tier": "A",
  "max_advance_naira": 335750,
  "threshold": 60,
  "terms": {
    "minimum_sweep_rate_pct": 13.0,
    "repayment_window_days": 90,
    "repayment_method": "Automatic sweep from every incoming Squad payment",
    "manual_repayment": "Allowed anytime, no penalty",
    "early_repayment_penalty": "None",
    "estimated_repayment_days": 45,
    "over_window_warning": false
  }
}
```

**When `eligible: false`**, response includes `reason`:
```json
{
  "eligible": false,
  "reason": "You have an active loan. Repay before applying for another.",
  "score": 67.15,
  "threshold": 60
}
```

**UI logic:**
```js
if (eligibility.eligible) {
  // Show credit offer card with max_advance_naira as slider max
  // Show terms.minimum_sweep_rate_pct as the sweep rate
} else {
  // Show reason why not eligible
  // If score < threshold, show score progress bar toward 60
}
```

---

### Apply for credit `POST /credit/apply`

**Screen:** Credit confirm screen (step 2 of 3)  
**Roles:** trader

```js
const body = {
  amount_naira: 180000,
  requested_sweep_rate_pct: null   // optional — trader can request higher rate
}
```

**Constraints:**
- Minimum: ₦5,000
- Maximum: ₦500,000 (also capped by `max_advance_naira` from eligibility)
- `requested_sweep_rate_pct` must be ≥ `minimum_sweep_rate_pct` from eligibility

**Response `200`:**
```json
{
  "id": 4,
  "trader_id": 1,
  "amount_kobo": 18000000,
  "amount_naira": 180000.0,
  "outstanding_kobo": 18900000,
  "outstanding_naira": 189000.0,
  "fee_amount_naira": 9000.0,
  "fee_rate_pct": 5.0,
  "total_repayable_naira": 189000.0,
  "status": "pending",
  "squad_transaction_ref": null,
  "sweep_rate_pct": 13.0,
  "repayment_window_days": 90,
  "disbursed_at": null,
  "created_at": "2026-05-15T00:00:00Z"
}
```

> Status starts as `pending`. Poll `GET /credit/loan/active` — it becomes `active` once Squad confirms the transfer. Show a loading/processing state until status = `active`.

**Revenue visible to UI:**
- `amount_naira` = what trader receives
- `fee_amount_naira` = Eko's 5% origination fee
- `total_repayable_naira` = principal + fee (what trader repays)

---

### Active loan `GET /credit/loan/active`

**Screen:** Repayment tracker screen, home dashboard (if active loan exists)  
**Roles:** trader

Returns loan object (same shape as apply response) or `null` if no active loan.

```js
const loan = await getLoan()
if (loan) {
  const repaidPct = ((loan.total_repayable_naira - loan.outstanding_naira) / loan.total_repayable_naira) * 100
  // Use repaidPct for the progress bar
}
```

---

### Loan history `GET /credit/loan/history`

**Screen:** Loan history list  
**Roles:** trader

Returns array of loan objects, newest first.

Loan status values: `pending` · `active` · `repaid` · `defaulted`

---

### Manual repayment `POST /credit/loan/repay`

**Screen:** Repayment tracker screen → repay button  
**Roles:** trader

```js
const body = { amount_naira: 20000 }
```

Minimum: ₦100. Capped at outstanding balance automatically — no overpayment possible.

---

### Repayment history `GET /credit/loan/{loan_id}/repayments`

**Screen:** Repayment tracker → transaction list  
**Roles:** trader

---

## EkoSave

### Enroll `POST /save/enroll`

**Screen:** EkoSave enrollment modal  
**Roles:** trader

```js
const body = { sweep_percentage: 5.0 }  // 1.0 – 30.0
```

After enrolling, every incoming Squad payment automatically sweeps this % into the EkoSave vault.

---

### Get EkoSave account `GET /save/me`

**Screen:** Wallet screen (EkoSave vault card), home dashboard  
**Roles:** trader

```json
{
  "id": 1,
  "trader_id": 1,
  "balance_kobo": 4820000,
  "balance_naira": 48200.0,
  "sweep_percentage": 5.0,
  "is_active": true
}
```

Returns `null` if not enrolled.

---

## Job matching

### Post opportunity `POST /match/opportunities`

**Screen:** Post a job screen  
**Roles:** trader

```js
const body = {
  title: "Market sales assistant",
  description: "Need help at my fabric stall during festive season.",
  daily_pay: 4000,           // NGN — min ₦500, max ₦100,000
  duration_days: 3,          // 1 – 90
  location: "Balogun Market, Lagos Island",
  language_required: "yoruba",      // optional
  skills_required: ["selling", "customer service"]  // optional array
}
```

**Response `201`:**
```json
{
  "id": 7,
  "trader_id": 1,
  "title": "Market sales assistant",
  "description": "Need help at my fabric stall...",
  "daily_pay": 4000,
  "duration_days": 3,
  "total_pay": 12000,
  "location": "Balogun Market, Lagos Island",
  "language_required": "yoruba",
  "skills_required": ["selling", "customer service"],
  "status": "open",
  "applicant_count": 0,
  "created_at": "2026-05-15T10:00:00Z"
}
```

> `total_pay` = `daily_pay × duration_days`. Display this prominently on the post confirmation screen.

---

### My postings `GET /match/opportunities/mine`

**Screen:** Trader's jobs list screen  
**Roles:** trader

Returns array of opportunity objects with `applicant_count` per posting.

Opportunity status values: `open` · `matched` · `in_progress` · `completed` · `cancelled`

---

### Browse opportunities `GET /match/opportunities`

**Screen:** Job seeker browse screen  
**Roles:** All authenticated

```json
[
  {
    "id": 7,
    "title": "Market sales assistant",
    "daily_pay": 4000,
    "duration_days": 3,
    "total_pay": 12000,
    "location": "Balogun Market, Lagos Island",
    "language_required": "yoruba",
    "skills_required": ["selling", "customer service"],
    "trader_business_name": "Amaka Fabrics",
    "trader_location": "Balogun Market, Lagos Island",
    "status": "open",
    "already_applied": false,
    "my_match_score": null,
    "created_at": "2026-05-15T10:00:00Z"
  }
]
```

**Key fields for UI:**
- `already_applied` → show "Applied" badge instead of apply button
- `my_match_score` → `null` before applying, `0–100` after applying (Claude's score)
- Only show opportunities with `status: "open"`

---

### Single opportunity `GET /match/opportunities/{opportunity_id}`

**Screen:** Opportunity detail screen  
**Roles:** All authenticated

---

### Apply `POST /match/opportunities/{opportunity_id}/apply`

**Screen:** Job seeker taps "Apply now"  
**Roles:** job_seeker

Body: `{}` (empty — seeker identity comes from token)

**Response `200` — Claude scores instantly:**
```json
{
  "id": 7,
  "opportunity_id": 7,
  "job_seeker_id": 1,
  "match_score": 95.0,
  "match_reasoning": "Perfect language and skills match with selling experience, reasonable commute distance, and exact pay alignment.",
  "engine_used": "claude",
  "status": "suggested",
  "squad_payout_ref": null,
  "paid_at": null,
  "created_at": "2026-05-15T10:05:00Z",
  "job_seeker_name": "Emeka Eze",
  "job_seeker_location": "Surulere, Lagos",
  "job_seeker_skills": ["selling", "carrying", "customer service"],
  "job_seeker_languages": ["yoruba", "english", "pidgin"],
  "job_seeker_daily_rate": 4000
}
```

> After applying, show the seeker their `match_score` and `match_reasoning`. This is real-time Claude output.

**Errors:**
- `409` — Already applied to this opportunity
- `400` — Opportunity is no longer open

---

### Ranked applicants `GET /match/opportunities/{opportunity_id}/applicants`

**Screen:** ⭐ Trader applicant review screen — THE MONEY SHOT  
**Roles:** trader (only the posting trader can access)

```json
[
  {
    "match_id": 7,
    "job_seeker_id": 1,
    "job_seeker_name": "Emeka Eze",
    "job_seeker_location": "Surulere, Lagos",
    "job_seeker_skills": ["selling", "carrying", "customer service"],
    "job_seeker_languages": ["yoruba", "english", "pidgin"],
    "job_seeker_daily_rate": 4000,
    "match_score": 95.0,
    "match_reasoning": "Perfect language and skills match with selling experience, reasonable commute distance, and exact pay alignment.",
    "engine_used": "claude",
    "status": "suggested"
  },
  {
    "match_id": 8,
    "job_seeker_name": "Adesola Fashola",
    "match_score": 78.0,
    "match_reasoning": "Good Yoruba speaker, close distance. Less sales experience.",
    "engine_used": "claude",
    "status": "suggested"
  }
]
```

**Sorted by `match_score` DESC — highest first.**

> This is what the judges need to see. Show each applicant as a card with their score badge and `match_reasoning` as the AI explanation text. This is Claude's output shown directly to the trader.

Match status values: `suggested` · `accepted` · `rejected` · `completed`

---

### Accept applicant `POST /match/applications/{match_id}/accept`

**Screen:** Trader taps "Accept" on an applicant card  
**Roles:** trader

Body: `{}` (empty)

**What happens automatically:**
- Accepted match → `status: accepted`
- All other applicants for this opportunity → `status: rejected`
- Opportunity status → `in_progress`

**Response:** Updated match object with `status: "accepted"`

**Errors:**
- `400` — Opportunity no longer open (someone already accepted)
- `403` — Not your opportunity

---

### Complete job `POST /match/applications/{match_id}/complete`

**Screen:** Trader marks job done → pay seeker  
**Roles:** trader

Body: `{}` (empty)

**Response `200`:**
```json
{
  "match_id": 7,
  "opportunity_title": "Market sales assistant",
  "job_seeker_name": "Emeka Eze",
  "total_pay_naira": 12000,
  "platform_fee_naira": 600,
  "total_charged_naira": 12600,
  "payout_reference": "WAGE_3C457497...",
  "payout_status": "processing",
  "message": "₦12,000 is being sent to Emeka Eze's account. Platform fee: ₦600."
}
```

**Revenue breakdown to show in UI:**
- `total_pay_naira` = wage Emeka receives (₦12,000)
- `platform_fee_naira` = Eko's 5% fee (₦600) — show as "platform fee"
- `total_charged_naira` = total debited from Amaka (₦12,600)

**What happens after this call:**
1. Amaka's wallet is debited ₦12,600 immediately
2. Squad transfer to Emeka initiated
3. Squad fires `transfer.success` webhook → Emeka's wallet credited ₦12,000
4. Match status → `completed`, `paid_at` set

Show `payout_status: "processing"` to the trader. Emeka sees the money once the webhook fires (usually seconds in production).

---

### My applications `GET /match/applications/mine`

**Screen:** Job seeker applications screen, active job tracker  
**Roles:** job_seeker

```json
[
  {
    "id": 7,
    "opportunity_id": 7,
    "job_seeker_id": 1,
    "match_score": 95.0,
    "match_reasoning": "Perfect language and skills match...",
    "engine_used": "claude",
    "status": "completed",
    "squad_payout_ref": "WAGE_3C457497...",
    "paid_at": "2026-05-15T00:30:22Z",
    "created_at": "2026-05-15T00:05:00Z"
  }
]
```

**Status → UI state mapping:**

| status | Seeker sees |
|--------|-------------|
| `suggested` | "Applied — waiting for trader" |
| `accepted` | "You got the job! 🎉" + job details |
| `rejected` | "Not selected this time" |
| `completed` | "Completed · ₦12,000 paid" + paid_at |

---

## Error handling

All errors return:
```json
{ "detail": "Human-readable error message" }
```

**Common status codes:**

| Code | Meaning | What to show |
|------|---------|--------------|
| `400` | Bad request / validation | Show `detail` message to user |
| `401` | Token expired or invalid | Redirect to login |
| `403` | Wrong role or not your resource | Show "Access denied" |
| `404` | Resource not found | Show empty state |
| `409` | Conflict (duplicate) | Show `detail` — e.g. "Already applied" |
| `500` | Server error | Show generic error, log to console |

---

## Suggested API call sequence per screen

### Trader home dashboard
```
GET /auth/me
GET /auth/onboard/trader/me
GET /wallet/me                    ← provisions wallet on first call
GET /score/{trader_id}            ← score card + credit eligibility
GET /credit/eligibility           ← show/hide credit offer
GET /save/me                      ← EkoSave vault balance
GET /match/opportunities/mine     ← active job count
```

### EkoScore detail screen
```
GET /score/{trader_id}            ← score + shap_values for bars
GET /score/{trader_id}/history    ← chart data
```

### Wallet screen
```
GET /wallet/me                    ← balance + VA details
GET /wallet/me/transactions       ← ledger
GET /save/me                      ← EkoSave vault
GET /credit/loan/active           ← repayment progress (if active)
```

### EkoCredit flow
```
GET /credit/eligibility           ← Screen 1: offer screen
POST /credit/apply                ← Screen 2: confirm → returns pending loan
  poll GET /credit/loan/active    ← Screen 3: wait for status = active
GET /credit/loan/active           ← Screen 4: repayment tracker
GET /credit/loan/{id}/repayments  ← repayment history list
```

### Post a job flow (trader)
```
POST /match/opportunities         ← post form submit
GET /match/opportunities/mine     ← redirect to my postings
GET /match/opportunities/{id}/applicants  ← applicant review
POST /match/applications/{id}/accept      ← accept one
POST /match/applications/{id}/complete    ← mark done + pay
```

### Browse jobs (job seeker)
```
GET /match/opportunities          ← job feed
POST /match/opportunities/{id}/apply  ← apply → score returned immediately
GET /match/applications/mine      ← my applications + status
GET /wallet/me                    ← earnings wallet
GET /wallet/me/transactions       ← transaction history
```

---

## React fetch helper (copy-paste)

```js
// api.js
const BASE_URL = 'http://localhost:8000'

export const api = {
  async request(method, path, body, token) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      ...(body && { body: JSON.stringify(body) }),
    })

    if (res.status === 401) {
      // Token expired — redirect to login
      window.location.href = '/login'
      return
    }

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.detail || 'Something went wrong')
    }

    return data
  },

  get: (path, token) => api.request('GET', path, null, token),
  post: (path, body, token) => api.request('POST', path, body, token),
}

// Usage
const token = localStorage.getItem('eko_token')

// Login
const { access_token, role } = await api.post('/auth/login', { email, password })
localStorage.setItem('eko_token', access_token)
localStorage.setItem('eko_role', role)

// Get score
const score = await api.get(`/score/${trader_id}`, token)

// Apply to job
const match = await api.post(`/match/opportunities/${oppId}/apply`, {}, token)
console.log(`Claude scored ${match.job_seeker_name}: ${match.match_score}%`)
console.log(`Reasoning: ${match.match_reasoning}`)
```

---

## Notes for frontend team

1. **Always call `GET /wallet/me` after login** — it auto-provisions the wallet. Without this, any money operation will fail with a 500 error.

2. **`total_pay` vs `total_charged_naira`** — when displaying the complete job confirmation to the trader, show both:
   - "Emeka receives: ₦12,000"
   - "Platform fee: ₦600"
   - "Total from your wallet: ₦12,600"

3. **Polling for loan status** — after `POST /credit/apply`, the loan is `pending`. In production it becomes `active` within seconds when Squad fires the webhook. For the demo, the backend simulation handles this. Poll `GET /credit/loan/active` every 2 seconds until `status === "active"`.

4. **Claude engine field** — `engine_used` on match records will be `claude` when the Anthropic API key is configured, `sentence_transformers` as fallback, `rule_based` as last resort. You can show a small "AI powered" badge when `engine_used === "claude"`.

5. **Match status flow:**
   ```
   suggested → accepted (trader accepts)
             → rejected (trader declines or another applicant accepted)
   accepted  → completed (trader marks job done + webhook confirms payout)
   ```

6. **CORS** — backend allows all origins in development. In production it will be locked to specific frontend URLs.

7. **Swagger UI** — use `http://localhost:8000/docs` to test any endpoint directly and see exact request/response shapes before building the UI for that screen.
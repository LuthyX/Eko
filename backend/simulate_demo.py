"""
Eko Demo Simulation Script
===========================
Runs the complete end-to-end demo flow without needing
Squad ledger balance. Simulates Squad webhooks manually
after each transfer so the flow completes correctly.

Flow:
  1. Login all demo accounts
  2. Provision wallets (GET /wallet/me)
  3. Seed Amaka's wallet with demo balance
  4. Amaka checks EkoCredit eligibility
  5. Amaka applies for ₦180,000 advance
  6. Simulate Squad transfer.success → loan activates, wallet credited
  7. Amaka posts a job
  8. Emeka applies → Claude scores instantly
  9. Amaka views ranked applicants
  10. Amaka accepts Emeka
  11. Amaka marks job complete → payout initiated
  12. Simulate Squad transfer.success → Emeka's wallet credited
  13. Print final wallet balances for both

Usage:
    python simulate_demo.py

Requirements:
    pip install httpx
    Server must be running: uvicorn app.main:app --reload
"""

import httpx
import json
import time
import sys

BASE = "http://localhost:8000"

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

passed = failed = 0

def ok(msg):
    global passed; passed += 1
    print(f"  {GREEN}✓{RESET} {msg}")

def fail(msg, detail=""):
    global failed; failed += 1
    print(f"  {RED}✗ FAIL:{RESET} {msg}")
    if detail: print(f"    {RED}→ {detail[:200]}{RESET}")

def section(title):
    print(f"\n{BOLD}{CYAN}{'─'*55}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'─'*55}{RESET}")

def info(msg): print(f"  {CYAN}→{RESET} {msg}")


def post(client, path, body=None, token=None):
    h = {"Authorization": f"Bearer {token}"} if token else {}
    return client.post(f"{BASE}{path}", json=body or {}, headers=h)

def get(client, path, token=None):
    h = {"Authorization": f"Bearer {token}"} if token else {}
    return client.get(f"{BASE}{path}", headers=h)

def login(client, email, password):
    r = post(client, "/auth/login", {"email": email, "password": password})
    if r.status_code == 200:
        return r.json()["access_token"]
    return None


def simulate_webhook(client, ref_prefix, ref):
    """
    Simulate a Squad transfer.success webhook.
    In production Squad fires this automatically.
    In sandbox without balance, we fire it manually.
    """
    payload = {
        "event": "transfer.success",
        "data": {
            "transaction_ref": ref,
            "amount": 0,
            "response_description": "Approved (simulated)"
        }
    }
    r = client.post(f"{BASE}/webhooks/squad", json=payload)
    return r.status_code == 200


def run():
    print(f"\n{BOLD}Eko Demo Simulation{RESET}")
    print(f"Server: {BASE}")
    print(f"Mode: Squad webhooks simulated (no ledger balance needed)\n")

    with httpx.Client(timeout=60) as client:

        # ── Health check ──────────────────────────────────────────────────────
        section("0 · Health check")
        r = get(client, "/health")
        if r.status_code == 200 and r.json().get("database") == "ok":
            ok("Server up, database connected")
        else:
            fail("Server not healthy", r.text)
            print(f"\n{RED}Start the server first: uvicorn app.main:app --reload{RESET}")
            sys.exit(1)

        # ── Login all accounts ────────────────────────────────────────────────
        section("1 · Login demo accounts")
        amaka_token = login(client, "amaka@eko.demo", "demo1234")
        emeka_token  = login(client, "emeka@eko.demo", "demo1234")

        if amaka_token: ok("Amaka logged in (trader)")
        else: fail("Amaka login failed"); sys.exit(1)

        if emeka_token: ok("Emeka logged in (job seeker)")
        else: fail("Emeka login failed"); sys.exit(1)

        # ── Provision wallets ─────────────────────────────────────────────────
        section("2 · Provision wallets")
        for name, token in [("Amaka", amaka_token), ("Emeka", emeka_token)]:
            r = get(client, "/wallet/me", token)
            if r.status_code == 200:
                w = r.json()
                va = w.get("virtual_account_number") or "not provisioned (Squad VA failed)"
                ok(f"{name} wallet — balance: ₦{w['balance_naira']:,.2f} · VA: {va}")
            else:
                fail(f"{name} wallet provision failed", r.text)

        # ── Seed Amaka's wallet with demo balance ─────────────────────────────
        section("3 · Seed Amaka's wallet with demo balance")
        info("Simulating incoming Squad payment of ₦500,000 to Amaka's virtual account...")

        # Get Amaka's wallet details
        r = get(client, "/wallet/me", amaka_token)
        amaka_wallet = r.json()
        customer_identifier = f"EKO_USER_{amaka_wallet['user_id']}"

        # Simulate a charge.success webhook (incoming payment)
        charge_payload = {
            "transaction_reference": "DEMO_SEED_001",
            "virtual_account_number": amaka_wallet.get("virtual_account_number", "0000000000"),
            "principal_amount": "500000.00",   # ₦500,000 — as string in naira (Squad format)
            "settled_amount": "500000.00",
            "fee_charged": "0.00",
            "transaction_date": "2026-05-14T10:00:00.000Z",
            "customer_identifier": customer_identifier,
            "transaction_indicator": "C",
            "remarks": "Demo seed payment",
            "currency": "NGN",
            "channel": "virtual-account",
            "meta": {
                "freeze_transaction_ref": None,
                "reason_for_frozen_transaction": None
            }
        }
        r = client.post(f"{BASE}/webhooks/squad", json=charge_payload)
        if r.status_code == 200:
            # Check updated balance
            r2 = get(client, "/wallet/me", amaka_token)
            bal = r2.json()["balance_naira"]
            ok(f"Amaka wallet seeded — balance now: ₦{bal:,.2f}")
        else:
            fail("Wallet seeding failed", r.text)
            info("Continuing anyway — wallet may already have balance")

        # ── EkoCredit eligibility ─────────────────────────────────────────────
        section("4 · EkoCredit eligibility check")
        r = get(client, "/credit/eligibility", amaka_token)
        if r.status_code == 200:
            elig = r.json()
            if elig["eligible"]:
                ok(f"Amaka eligible — score: {elig['score']} · max advance: ₦{elig['max_advance_naira']:,}")
                ok(f"Sweep rate: {elig['terms']['minimum_sweep_rate_pct']}% · window: {elig['terms']['repayment_window_days']} days")
                max_advance = elig["max_advance_naira"]
            else:
                fail(f"Not eligible: {elig.get('reason')}")
                info("Score may be below 60 — try recomputing: POST /score/compute/{trader_id}")
                max_advance = 50000  # fallback for demo
        else:
            fail("Eligibility check failed", r.text)
            max_advance = 50000

        # ── Apply for EkoCredit ───────────────────────────────────────────────
        section("5 · Amaka applies for EkoCredit advance")
        advance_amount = min(180000, max_advance)
        info(f"Applying for ₦{advance_amount:,}...")

        r = post(client, "/credit/apply", {"amount_naira": advance_amount}, amaka_token)
        if r.status_code == 200:
            loan = r.json()
            loan_id = loan["id"]
            idempotency_key = None

            # Get the idempotency key from the loan to simulate webhook
            # It's stored as squad_transaction_ref or we can get it from DB
            squad_ref = loan.get("squad_transaction_ref")

            ok(f"Loan created — id={loan_id} status={loan['status']}")
            ok(f"Principal: ₦{loan['amount_naira']:,} · Fee: ₦{loan['fee_amount_naira']:,} · Total repayable: ₦{loan['total_repayable_naira']:,}")
            info(f"Squad ref: {squad_ref or 'not set (Squad transfer failed — simulating)'}")
        else:
            fail("Credit apply failed", r.text)
            loan_id = None
            squad_ref = None

        # ── Simulate Squad confirming EkoCredit disbursement ──────────────────
        section("6 · Simulate Squad confirming credit disbursement")
        if loan_id:
            # We need the idempotency_key used for the loan
            # It starts with CREDIT_ — get it from the active loan endpoint
            r = get(client, "/credit/loan/active", amaka_token)
            if r.status_code == 200 and r.json():
                active_loan = r.json()
                ref_to_use = active_loan.get("squad_transaction_ref")

                if ref_to_use:
                    info(f"Firing transfer.success for ref: {ref_to_use}")
                    if simulate_webhook(client, "CREDIT_", ref_to_use):
                        ok("Webhook accepted")
                        time.sleep(0.5)
                        # Check loan status
                        r2 = get(client, "/credit/loan/active", amaka_token)
                        if r2.status_code == 200 and r2.json():
                            loan_status = r2.json()["status"]
                            ok(f"Loan status: {loan_status}")
                        # Check wallet
                        r3 = get(client, "/wallet/me", amaka_token)
                        bal = r3.json()["balance_naira"]
                        ok(f"Amaka wallet after disbursement: ₦{bal:,.2f}")
                    else:
                        fail("Webhook simulation failed")
                else:
                    info("No Squad ref on loan (Squad transfer failed in sandbox)")
                    info("Loan stays pending — this is expected without ledger balance")
                    info("In production this resolves automatically when Squad fires the webhook")
            else:
                info("No active loan found — may have failed silently")

        # ── Post a job ────────────────────────────────────────────────────────
        section("7 · Amaka posts a job")
        job_payload = {
            "title": "Market sales assistant",
            "description": "Need help at my fabric stall during festive season. Yoruba speaker preferred.",
            "daily_pay": 4000,
            "duration_days": 3,
            "location": "Balogun Market, Lagos Island",
            "language_required": "yoruba",
            "skills_required": ["selling", "customer service"],
        }
        r = post(client, "/match/opportunities", job_payload, amaka_token)
        if r.status_code == 201:
            opp = r.json()
            opp_id = opp["id"]
            ok(f"Job posted — id={opp_id} · total pay: ₦{opp['total_pay']:,}")
        else:
            fail("Post job failed", r.text)
            sys.exit(1)

        # ── Emeka applies → Claude scores ─────────────────────────────────────
        section("8 · Emeka applies → Claude scores in real time")
        r = post(client, f"/match/opportunities/{opp_id}/apply", {}, emeka_token)
        if r.status_code == 200:
            match = r.json()
            match_id = match["id"]
            score = match.get("match_score")
            engine = match.get("engine_used", "unknown")
            reasoning = match.get("match_reasoning", "")

            ok(f"Application created — match_id={match_id}")
            ok(f"Scored by {BOLD}{engine}{RESET} — {YELLOW}{score:.1f}%{RESET}")
            if reasoning:
                ok(f"Reasoning: \"{reasoning}\"")
            else:
                info("No reasoning — check ANTHROPIC_API_KEY in .env")
        else:
            fail("Apply failed", r.text)
            sys.exit(1)

        # ── Amaka views ranked applicants (THE MONEY SHOT) ────────────────────
        section("9 · Amaka views ranked applicants ⭐")
        r = get(client, f"/match/opportunities/{opp_id}/applicants", amaka_token)
        if r.status_code == 200:
            applicants = r.json()
            ok(f"{len(applicants)} applicant(s) — sorted by Claude score")
            print()
            for i, a in enumerate(applicants, 1):
                score_str = f"{a['match_score']:.1f}%" if a["match_score"] else "unscored"
                print(f"    {BOLD}#{i}{RESET} {a['job_seeker_name']} — {YELLOW}{score_str}{RESET} ({a.get('engine_used', '?')})")
                if a.get("match_reasoning"):
                    print(f"       \"{a['match_reasoning']}\"")
            print()
        else:
            fail("Get applicants failed", r.text)

        # ── Amaka accepts Emeka ───────────────────────────────────────────────
        section("10 · Amaka accepts Emeka")
        r = post(client, f"/match/applications/{match_id}/accept", {}, amaka_token)
        if r.status_code == 200:
            ok(f"Emeka accepted — status: {r.json()['status']}")
        else:
            fail("Accept failed", r.text)

        # ── Check Amaka balance before payout ─────────────────────────────────
        r = get(client, "/wallet/me", amaka_token)
        amaka_before = r.json()["balance_naira"]
        info(f"Amaka balance before payout: ₦{amaka_before:,.2f}")

        r = get(client, "/wallet/me", emeka_token)
        emeka_before = r.json()["balance_naira"]
        info(f"Emeka balance before payout: ₦{emeka_before:,.2f}")

        # ── Mark job complete ─────────────────────────────────────────────────
        section("11 · Amaka marks job complete → payout initiated")
        r = post(client, f"/match/applications/{match_id}/complete", {}, amaka_token)
        if r.status_code == 200:
            completion = r.json()
            payout_ref = completion.get("payout_reference")
            wage = completion["total_pay_naira"]
            fee = completion["platform_fee_naira"]
            charged = completion["total_charged_naira"]

            ok(f"Job complete!")
            ok(f"Wage to Emeka: ₦{wage:,}")
            ok(f"Platform fee (Eko revenue): ₦{fee:,}")
            ok(f"Total charged to Amaka: ₦{charged:,}")
            ok(f"Payout ref: {payout_ref or 'none (Squad transfer failed — will simulate)'}")

            # Verify Amaka was debited
            r2 = get(client, "/wallet/me", amaka_token)
            amaka_after_debit = r2.json()["balance_naira"]
            ok(f"Amaka wallet after debit: ₦{amaka_after_debit:,.2f} (was ₦{amaka_before:,.2f})")
        else:
            fail("Complete job failed", r.text)
            payout_ref = None
            sys.exit(1)

        # ── Simulate Squad confirming wage payout ─────────────────────────────
        # ── Step 12 ───────────────────────────────────────────
        section("12 · Simulate Squad confirming wage payout to Emeka")

        # Get payout_idempotency_key directly from DB
        import sys as _sys
        _sys.path.insert(0, '.')
        import app.models.user as _mu
        from app.core.database import SessionLocal as _SL
        from app.models.user import Match as _Match
        _db = _SL()
        _m = _db.query(_Match).filter(_Match.id == match_id).first()
        wage_ref = _m.payout_idempotency_key if _m else None
        _db.close()

        if wage_ref:
            info(f"Firing webhook with payout key: {wage_ref}")
            wage_payload = {
                "event": "transfer.success",
                "data": {
                    "transaction_ref": wage_ref,
                    "amount": completion["total_pay_naira"] * 100,
                    "response_description": "Approved (simulated)"
                }
            }
            r = client.post(f"{BASE}/webhooks/squad", json=wage_payload)
            if r.status_code == 200:
                ok("Wage payout webhook accepted")
                time.sleep(0.5)
                r2 = get(client, "/wallet/me", emeka_token)
                emeka_after = r2.json()["balance_naira"]
                ok(f"Emeka wallet: ₦{emeka_after:,.2f} (was ₦{emeka_before:,.2f})")
                ok(f"Emeka received: ₦{emeka_after - emeka_before:,.2f}")
                r3 = get(client, "/match/applications/mine", emeka_token)
                final_match = next((a for a in r3.json() if a["id"] == match_id), None)
                if final_match:
                    ok(f"Match status: {final_match['status']}")
                    if final_match.get("paid_at"):
                        ok(f"Paid at: {final_match['paid_at']}")
            else:
                fail("Wage webhook failed", r.text)
        else:
            fail("Could not find payout key")

        # ── Final summary ─────────────────────────────────────────────────────
        section("13 · Final state")

        r = get(client, "/wallet/me", amaka_token)
        amaka_final = r.json()
        print(f"  {BOLD}Amaka (trader){RESET}")
        print(f"    Wallet: ₦{amaka_final['balance_naira']:,.2f}")

        r = get(client, "/credit/loan/active", amaka_token)
        if r.status_code == 200 and r.json():
            loan = r.json()
            print(f"    Active loan: ₦{loan['outstanding_naira']:,.2f} outstanding ({loan['status']})")

        r = get(client, "/wallet/me", emeka_token)
        emeka_final = r.json()
        print(f"\n  {BOLD}Emeka (job seeker){RESET}")
        print(f"    Wallet: ₦{emeka_final['balance_naira']:,.2f}")

        r = get(client, "/wallet/me/transactions", emeka_token)
        if r.status_code == 200:
            txns = r.json()
            wage_txn = next((t for t in txns if t["tx_type"] == "credit_wage_received"), None)
            if wage_txn:
                print(f"    Wage received: ₦{wage_txn['amount_naira']:,.2f} ✓")

        # ── Result ────────────────────────────────────────────────────────────
        print(f"\n{'═'*55}")
        print(f"{BOLD}  {GREEN}{passed} passed{RESET}  {RED}{failed} failed{RESET}{RESET}")
        print(f"{'═'*55}\n")

        if failed == 0:
            print(f"{GREEN}{BOLD}  ✓ Full demo flow completed successfully.{RESET}")
        else:
            print(f"{YELLOW}{BOLD}  ⚠ Some steps failed — review above.{RESET}")

        print(f"""
  {BOLD}Key demo moments to show judges:{RESET}

  1. Screen 9  — Ranked applicants with Claude reasoning
     GET /match/opportunities/{opp_id}/applicants

  2. Screen 14 — EkoCredit offer with SHAP breakdown
     GET /score/<trader_id>
     GET /credit/eligibility

  3. Screen 20 — Emeka's wallet showing wage credited
     GET /wallet/me  (Emeka's token)
     GET /wallet/me/transactions

  Swagger UI: http://localhost:8000/docs
        """)


if __name__ == "__main__":
    run()
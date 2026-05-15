"""
Squad sandbox verification script.

Run this BEFORE starting the server to confirm your Squad
credentials are working and all API calls behave as expected.

Usage:
    python verify_squad.py

What it checks:
    1. Secret key is valid (hits /merchant/balance)
    2. Virtual account creation works (creates a test VA)
    3. Account lookup works
    4. Webhook URL is reachable (manual check reminder)
"""
import os
import sys
import httpx
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("SQUAD_BASE_URL", "https://sandbox-api-d.squadco.com")
SECRET_KEY = os.getenv("SQUAD_SECRET_KEY", "")

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BOLD = "\033[1m"
RESET = "\033[0m"

passed = 0
failed = 0

def ok(msg): global passed; passed += 1; print(f"  {GREEN}✓{RESET} {msg}")
def fail(msg, detail=""): global failed; failed += 1; print(f"  {RED}✗{RESET} {msg}"); detail and print(f"    {RED}→ {detail}{RESET}")
def info(msg): print(f"  → {msg}")
def section(t): print(f"\n{BOLD}{t}{RESET}")


def headers():
    return {
        "Authorization": f"Bearer {SECRET_KEY}",
        "Content-Type": "application/json",
    }


def run():
    print(f"\n{BOLD}Squad Sandbox Verification{RESET}")
    print(f"Base URL: {BASE_URL}")
    print(f"Secret key: {SECRET_KEY[:20]}..." if SECRET_KEY else f"{RED}SECRET KEY NOT SET{RESET}")

    if not SECRET_KEY:
        print(f"\n{RED}SQUAD_SECRET_KEY is not set in .env — cannot proceed.{RESET}")
        sys.exit(1)

    with httpx.Client(timeout=15) as client:

        # ── 1. Ledger balance ────────────────────────────────────────────────
        section("1 · Verify secret key (ledger balance)")
        r = client.get(
            f"{BASE_URL}/merchant/balance",
            params={"currency_id": "NGN"},
            headers=headers(),
        )
        if r.status_code == 200 and r.json().get("success"):
            balance_kobo = int(r.json()["data"]["balance"])
            ok(f"Secret key valid — ledger balance: ₦{balance_kobo/100:,.2f}")
            if balance_kobo == 0:
                print(f"  {YELLOW}⚠ Balance is ₦0 — fund your Squad sandbox account to test transfers{RESET}")
        elif r.status_code == 401:
            fail("Secret key invalid or expired", r.text[:200])
            print(f"\n{RED}Cannot proceed — fix your SQUAD_SECRET_KEY in .env{RESET}")
            sys.exit(1)
        elif r.status_code == 403:
            fail("Wrong API key — Merchant authentication failed", r.text[:200])
            sys.exit(1)
        else:
            fail(f"Unexpected response ({r.status_code})", r.text[:200])

        # ── 2. Virtual account creation ──────────────────────────────────────
        section("2 · Virtual account creation")
        info("Creating test virtual account for EKO_VERIFY_001...")
        r = client.post(
            f"{BASE_URL}/virtual-account",
            json={
                "customer_identifier": "EKO_VERIFY_001",
                "first_name": "Eko",
                "last_name": "Test",
                "middle_name": ".",
                "mobile_num": "08011111111",
                "dob": "01/01/1990",
                "email": "verify@eko-platform.com",
                "bvn": "00000000000",    # sandbox dummy BVN
                "gender": "1",
                "address": "Lagos, Nigeria",
            },
            headers=headers(),
        )
        if r.status_code == 200 and r.json().get("success"):
            data = r.json()["data"]
            acct = data.get("virtual_account_number") or data.get("account_number")
            bank = data.get("bank_name", "Wema Bank")
            ok(f"Virtual account created: {acct} ({bank})")
            info(f"This is the account number traders/seekers get for receiving payments")
        elif r.status_code == 200 and not r.json().get("success"):
            msg = r.json().get("message", "")
            if "already exists" in msg.lower() or "duplicate" in msg.lower():
                ok(f"Virtual account already exists for EKO_VERIFY_001 (safe — idempotent)")
            else:
                fail(f"VA creation failed: {msg}")
                info("Common causes: BVN validation failure, missing required fields")
        else:
            fail(f"VA creation error ({r.status_code})", r.text[:300])
            if r.status_code == 400:
                info("Check: does your Squad sandbox account require GTBank settlement account?")
                info("Try adding 'beneficiary_account': '<your-gtbank-account-number>' to the payload")

        # ── 3. Account lookup ────────────────────────────────────────────────
        section("3 · Account lookup (verify before transfers)")
        info("Looking up GTBank 0013456789 (test account)...")
        r = client.post(
            f"{BASE_URL}/payout/account/lookup",
            json={"bank_code": "000013", "account_number": "0013456789"},
            headers=headers(),
        )
        if r.status_code == 200 and r.json().get("success"):
            data = r.json()["data"]
            ok(f"Account lookup works: {data.get('account_name')} · {data.get('account_number')}")
        else:
            # 400 is expected if test account doesn't exist — that's fine
            # What matters is we got a structured response, not a 401/403
            if r.status_code in (400, 422):
                ok(f"Account lookup endpoint reachable (test account not found — expected)")
            elif r.status_code == 401:
                fail("Account lookup failed — auth error")
            else:
                info(f"Account lookup returned {r.status_code} — {r.text[:100]}")

        # ── 4. Transfer API reachable ────────────────────────────────────────
        section("4 · Transfer API (dry run — no actual transfer)")
        info("Checking /payout/transfer endpoint is reachable...")
        # We send a deliberately invalid payload to get a 400 (not 401/403)
        # which confirms the endpoint is reachable and auth is working
        r = client.post(
            f"{BASE_URL}/payout/transfer",
            json={"transaction_reference": "VERIFY_DRY_RUN"},
            headers=headers(),
        )
        if r.status_code == 400:
            ok("Transfer endpoint reachable — auth valid (got 400 for missing fields as expected)")
        elif r.status_code in (401, 403):
            fail(f"Transfer endpoint auth failed ({r.status_code})", r.text[:200])
        else:
            ok(f"Transfer endpoint reachable (status {r.status_code})")

    # ── 5. Webhook reminder ──────────────────────────────────────────────────
    section("5 · Webhook setup (manual check)")
    print(f"""
  To receive Squad webhooks locally you need ngrok:

  {BOLD}Step 1:{RESET} Install ngrok from https://ngrok.com
  {BOLD}Step 2:{RESET} Run:  ngrok http 8000
  {BOLD}Step 3:{RESET} Copy the HTTPS URL (e.g. https://abc123.ngrok.io)
  {BOLD}Step 4:{RESET} Go to Squad sandbox dashboard:
            → Settings → API & Webhook
            → Webhook URL: https://abc123.ngrok.io/webhooks/squad
  {BOLD}Step 5:{RESET} Copy the webhook secret from the dashboard
            → Add to .env: SQUAD_WEBHOOK_SECRET=<secret>

  Squad's sending IP: {YELLOW}18.133.63.109{RESET}
  (You can whitelist this in firewall rules if needed)
    """)

    # ── Summary ──────────────────────────────────────────────────────────────
    print(f"\n{'─' * 50}")
    print(f"{BOLD}Results: {GREEN}{passed} passed{RESET}  {RED}{failed} failed{RESET}{RESET}\n")

    if failed == 0:
        print(f"{GREEN}{BOLD}✓ Squad sandbox is configured correctly.{RESET}")
        print(f"  Next steps:")
        print(f"  1. Set up ngrok + webhook URL in Squad dashboard (Step 5 above)")
        print(f"  2. Fund your sandbox account (Squad dashboard → Funding)")
        print(f"  3. Start server: uvicorn app.main:app --reload")
        print(f"  4. Provision wallets: GET /wallet/me for each demo account")
    else:
        print(f"{RED}{BOLD}✗ Fix the errors above before proceeding.{RESET}")

    print()


if __name__ == "__main__":
    run()
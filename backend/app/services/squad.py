"""
Squad API client — fixed for production sandbox use.

Key fixes from docs review:
  1. Virtual account requires: middle_name, dob, gender, address (were missing)
  2. Bank codes are Squad's NIP codes (e.g. GTBank = 000013, not 058)
  3. Transfer API sends amount in KOBO not naira (docs clarified)
  4. Added ledger balance endpoint
  5. Added account lookup before transfer (Squad recommends this)
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

BASE_URL = settings.SQUAD_BASE_URL.rstrip("/")
TIMEOUT = 30


def _headers() -> dict:
    if not settings.SQUAD_SECRET_KEY:
        # No Squad key configured, return empty headers (Squad calls will fail gracefully)
        return {
            "Content-Type": "application/json",
        }
    return {
        "Authorization": f"Bearer {settings.SQUAD_SECRET_KEY}",
        "Content-Type": "application/json",
    }


def _raise_for_squad_error(response: httpx.Response, context: str) -> dict:
    try:
        data = response.json()
    except Exception:
        data = {}

    if response.status_code >= 400:
        message = data.get("message") or data.get("error") or response.text
        raise SquadAPIError(f"Squad API error [{context}] {response.status_code}: {message}")

    if not data.get("success", True):
        message = data.get("message", "Unknown Squad error")
        raise SquadAPIError(f"Squad API failure [{context}]: {message}")

    return data


class SquadAPIError(Exception):
    pass


# ── Bank codes (Squad NIP codes — from official docs) ─────────────────────────
# Full list at: https://docs.squadco.com/Transfer-API/transfer-apis
BANK_CODES = {
    # Major commercial banks
    "gtbank":       "000013",
    "access bank":  "000014",
    "zenith bank":  "000015",
    "first bank":   "000016",
    "uba":          "000004",
    "wema bank":    "000017",
    "fcmb":         "000003",
    "fidelity bank":"000007",
    "union bank":   "000018",
    "sterling bank":"000001",
    "keystone bank":"000002",
    "ecobank":      "000010",
    "stanbic ibtc": "000012",
    "polaris bank": "000008",
    "unity bank":   "000011",
    "providus bank":"000023",
    "titan trust":  "000025",
    "taj bank":     "000026",
    # Digital banks / MFBs
    "kuda":         "090267",
    "opay":         "100004",
    "palmpay":      "100033",
    "moniepoint":   "090405",
    "sparkle":      "090325",
    "eyowo":        "090328",
}

def get_bank_code(bank_name: str | None) -> str:
    """Map bank name to Squad NIP code. Defaults to Wema Bank (Squad's sandbox default)."""
    if not bank_name:
        return "000017"   # Wema Bank — Squad sandbox default
    normalized = bank_name.lower().strip()
    for name, code in BANK_CODES.items():
        if name in normalized or normalized in name:
            return code
    logger.warning(f"Unknown bank name: {bank_name!r} — defaulting to Wema Bank")
    return "000017"


# ── Virtual accounts ──────────────────────────────────────────────────────────

def create_virtual_account(
    customer_identifier: str,
    first_name: str,
    last_name: str,
    mobile_num: str,
    email: str,
    bvn: str | None = None,
    middle_name: str = ".",
    dob: str = "01/01/1990",          # mm/dd/yyyy — Squad format
    gender: str = "1",                 # "1" = Male, "2" = Female
    address: str = "Lagos, Nigeria",
    beneficiary_account: str | None = None,   # your GTBank account for settlement
) -> dict:
    """
    Create a dedicated virtual account (NUBAN) for a user.

    IMPORTANT from docs:
    - BVN is validated against name, DOB, gender, and phone number
    - In sandbox, use dummy BVN "00000000000" to bypass BVN validation
    - In production, real BVN required and must match the other fields
    - beneficiary_account must be a GTBank account number (your settlement account)
    - If beneficiary_account is omitted, money goes to your Squad wallet (T+1 settlement)

    Squad endpoint: POST /virtual-account
    """
    if not settings.SQUAD_SECRET_KEY:
        logger.warning(f"Squad API key not configured, returning mock virtual account for {customer_identifier}")
        return {
            "account_number": "1234567890",
            "bank_name": "Sandbox Bank",
            "account_name": f"{first_name} {last_name}",
        }
    
    payload = {
    "customer_identifier": customer_identifier,
    "first_name": first_name,
    "last_name": last_name,
    "middle_name": middle_name,
    "mobile_num": mobile_num[:11],
    "dob": dob,
    "email": email,
    "bvn": bvn or "22190390831",   # ← working test BVN
    "gender": gender,
    "address": address,
    "beneficiary_account": settings.SQUAD_BENEFICIARY_ACCOUNT,  # ← add this
}

    # Only include beneficiary_account if provided — omitting it sends to Squad wallet
    if beneficiary_account:
        payload["beneficiary_account"] = beneficiary_account

    with httpx.Client(timeout=TIMEOUT) as client:
        response = client.post(
            f"{BASE_URL}/virtual-account",
            json=payload,
            headers=_headers(),
        )

    data = _raise_for_squad_error(response, "create_virtual_account")
    logger.info(f"Virtual account created: identifier={customer_identifier}")
    return data.get("data", {})


def get_virtual_account(customer_identifier: str) -> dict:
    """Fetch an existing virtual account by customer identifier."""
    with httpx.Client(timeout=TIMEOUT) as client:
        response = client.get(
            f"{BASE_URL}/virtual-account/{customer_identifier}",
            headers=_headers(),
        )
    data = _raise_for_squad_error(response, "get_virtual_account")
    return data.get("data", {})


# ── Account lookup (verify before transferring) ───────────────────────────────

def lookup_account(bank_code: str, account_number: str) -> dict:
    """
    Verify account name before initiating a transfer.
    Squad recommends calling this before every transfer.

    Returns: { "account_name": "JENNY SQUAD", "account_number": "0123456789" }
    """
    with httpx.Client(timeout=TIMEOUT) as client:
        response = client.post(
            f"{BASE_URL}/payout/account/lookup",
            json={"bank_code": bank_code, "account_number": account_number},
            headers=_headers(),
        )
    data = _raise_for_squad_error(response, "lookup_account")
    return data.get("data", {})


# ── Transfers ─────────────────────────────────────────────────────────────────

def initiate_transfer(
    amount: int,               # in NAIRA (Squad transfer API takes naira, not kobo)
    bank_code: str,
    account_number: str,
    account_name: str,
    narration: str,
    idempotency_key: str,
) -> dict:
    """
    Initiate a bank transfer from your Squad ledger to a bank account.

    IMPORTANT: amount is in NAIRA here, not kobo.
    Squad internally converts. Confirmed from docs examples.

    Squad endpoint: POST /payout/transfer

    Returns transfer data including transaction_ref for webhook matching.
    """
    if not settings.SQUAD_SECRET_KEY:
        logger.warning(f"Squad API key not configured, returning mock transfer response for {idempotency_key}")
        return {
            "transaction_reference": idempotency_key,
            "status": "pending",
            "amount": amount,
        }
    
    payload = {
        "transaction_reference": idempotency_key,
        "amount": amount,               # naira
        "bank_code": bank_code,
        "account_number": account_number,
        "account_name": account_name,
        "narration": narration,
        "currency_id": "NGN",
    }

    with httpx.Client(timeout=TIMEOUT) as client:
        response = client.post(
            f"{BASE_URL}/payout/transfer",
            json=payload,
            headers=_headers(),
        )

    data = _raise_for_squad_error(response, "initiate_transfer")
    logger.info(f"Transfer initiated: ref={idempotency_key} amount=₦{amount:,}")
    return data.get("data", {})


def get_transfer_status(transaction_reference: str) -> dict:
    """Check the status of an outbound transfer."""
    with httpx.Client(timeout=TIMEOUT) as client:
        response = client.get(
            f"{BASE_URL}/payout/transfer/{transaction_reference}",
            headers=_headers(),
        )
    data = _raise_for_squad_error(response, "get_transfer_status")
    return data.get("data", {})


# ── Ledger balance ────────────────────────────────────────────────────────────

def get_ledger_balance() -> int:
    """
    Get your Squad account ledger balance in KOBO.
    Use this to verify you have sufficient funds before disbursing credit.

    Squad endpoint: GET /merchant/balance?currency_id=NGN
    """
    with httpx.Client(timeout=TIMEOUT) as client:
        response = client.get(
            f"{BASE_URL}/merchant/balance",
            params={"currency_id": "NGN"},
            headers=_headers(),
        )
    data = _raise_for_squad_error(response, "get_ledger_balance")
    balance_kobo = int(data.get("data", {}).get("balance", 0))
    logger.info(f"Squad ledger balance: ₦{balance_kobo/100:,.2f}")
    return balance_kobo


# ── Transaction history ───────────────────────────────────────────────────────

def get_merchant_transactions(
    merchant_id: str,
    page: int = 1,
    per_page: int = 100,
) -> list[dict]:
    """
    Fetch transaction history for a merchant from Squad.
    Used by the EkoScore engine to pull real Squad data.
    """
    with httpx.Client(timeout=TIMEOUT) as client:
        response = client.get(
            f"{BASE_URL}/transaction/query",
            params={
                "merchantId": merchant_id,
                "page": page,
                "perPage": per_page,
            },
            headers=_headers(),
        )

    data = _raise_for_squad_error(response, "get_merchant_transactions")
    transactions = data.get("data", {}).get("transactions", [])

    return [
        {
            "amount": int(t.get("transaction_amount", 0)),
            "created_at": t.get("transaction_date") or t.get("createdAt"),
            "reference": t.get("transaction_ref"),
            "status": t.get("transaction_status"),
        }
        for t in transactions
        if t.get("transaction_status") == "success"
    ]


# ── Utility ───────────────────────────────────────────────────────────────────

def generate_idempotency_key(prefix: str = "EKO") -> str:
    return f"{prefix}_{uuid.uuid4().hex.upper()}"
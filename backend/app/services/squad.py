"""
Squad API client — Phase 3.

All outbound HTTP calls to Squad's sandbox API live here.
Every call is wrapped in error handling and returns a typed result.
Idempotency keys are required on every mutation.

Squad sandbox base: https://sandbox-api-d.squadco.com
Docs: https://squadinc.gitbook.io/squad-api-documentation
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

BASE_URL = settings.SQUAD_BASE_URL.rstrip("/")
TIMEOUT = 30  # seconds


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.SQUAD_SECRET_KEY}",
        "Content-Type": "application/json",
    }


def _raise_for_squad_error(response: httpx.Response, context: str):
    """Raises a descriptive exception if Squad returns a non-2xx or error payload."""
    try:
        data = response.json()
    except Exception:
        data = {}

    if response.status_code >= 400:
        message = data.get("message") or data.get("error") or response.text
        raise SquadAPIError(f"Squad API error [{context}] {response.status_code}: {message}")

    # Squad sometimes returns 200 with success: false
    if not data.get("success", True):
        message = data.get("message", "Unknown Squad error")
        raise SquadAPIError(f"Squad API failure [{context}]: {message}")

    return data


class SquadAPIError(Exception):
    pass


# ── Virtual accounts ──────────────────────────────────────────────────────────

def create_virtual_account(
    customer_identifier: str,
    first_name: str,
    last_name: str,
    mobile_num: str,
    email: str,
    bvn: str | None = None,
) -> dict:
    """
    Create a dedicated virtual account (NUBAN) for a user.
    Returns the virtual account details including account_number and bank_name.

    Squad endpoint: POST /virtual-account
    """
    payload = {
        "customer_identifier": customer_identifier,
        "first_name": first_name,
        "last_name": last_name,
        "mobile_num": mobile_num,
        "email": email,
        "bvn": bvn or "00000000000",  # sandbox accepts dummy BVN
    }

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


# ── Transfers (disbursements + payouts) ───────────────────────────────────────

def initiate_transfer(
    amount: int,           # in Naira (NOT kobo — Squad transfer API uses Naira)
    bank_code: str,
    account_number: str,
    account_name: str,
    narration: str,
    idempotency_key: str,
) -> dict:
    """
    Initiate a bank transfer (disbursement to trader or wage payout to job seeker).
    Amount in Naira. Squad converts internally.

    Squad endpoint: POST /payout/transfer
    """
    payload = {
        "transaction_reference": idempotency_key,
        "amount": amount,
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
    logger.info(f"Transfer initiated: ref={idempotency_key} amount=₦{amount}")
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


# ── Transaction history ───────────────────────────────────────────────────────

def get_merchant_transactions(
    merchant_id: str,
    page: int = 1,
    per_page: int = 100,
) -> list[dict]:
    """
    Fetch transaction history for a merchant from Squad.
    Used by the EkoScore engine to get real Squad data.

    Squad endpoint: GET /transaction/query
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

    # Normalise to our internal format: {amount, created_at}
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
    """Generate a unique idempotency key for Squad API calls."""
    return f"{prefix}_{uuid.uuid4().hex.upper()}"
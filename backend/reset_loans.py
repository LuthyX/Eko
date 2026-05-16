"""
Eko Loan Reset Script
=====================
Clears all loans, repayments, and loan-related wallet transactions
so demo accounts can test the full EkoCredit flow from scratch.

Usage:
    # From your backend root:
    python reset_loans.py

    # Dry run — see what would be deleted without doing it:
    python reset_loans.py --dry-run

    # Reset a single user:
    python reset_loans.py --email amaka@eko.demo

    # Reset + seed wallet with ₦500k so repayment can be tested:
    python reset_loans.py --seed-balance

    # Reset + seed a specific amount:
    python reset_loans.py --seed-balance --seed-amount 1000000
"""
import sys
import os
import argparse

# Run from backend root: python reset_loans.py
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.models.user import Loan, Repayment, TraderProfile, User, UserRole
from app.models.wallet import Wallet, WalletTransaction, WalletTxType, WalletTxStatus
from datetime import datetime, timezone
import uuid


def utcnow():
    return datetime.now(timezone.utc)


def generate_key(prefix="SEED"):
    return f"{prefix}_{uuid.uuid4().hex.upper()}"


# ── Reset loans ───────────────────────────────────────────────────────────────

def reset_loans(db, dry_run: bool = False, email: str | None = None):
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Eko Loan Reset")
    print("=" * 55)

    query = db.query(TraderProfile).join(User, User.id == TraderProfile.user_id)
    if email:
        query = query.filter(User.email == email)
    else:
        query = query.filter(User.role == UserRole.trader)

    traders = query.all()

    if not traders:
        print(f"  No traders found{f' matching {email}' if email else ''}.")
        return

    print(f"\n  Found {len(traders)} trader(s)\n")

    total_loans = 0
    total_repayments = 0
    total_txns = 0

    for trader in traders:
        user = trader.user
        wallet = db.query(Wallet).filter(Wallet.user_id == user.id).first()

        loans = db.query(Loan).filter(Loan.trader_id == trader.id).all()
        loan_ids = [l.id for l in loans]

        repayments = (
            db.query(Repayment)
            .filter(Repayment.loan_id.in_(loan_ids))
            .all()
        ) if loan_ids else []

        # Wallet txns tied to loans
        loan_txns = []
        if wallet and loan_ids:
            loan_txns = (
                db.query(WalletTransaction)
                .filter(
                    WalletTransaction.wallet_id == wallet.id,
                    WalletTransaction.tx_type.in_([
                        WalletTxType.credit_loan_disbursement,
                        WalletTxType.debit_loan_repayment,
                    ])
                )
                .all()
            )

        bal_str = f"₦{wallet.balance_kobo / 100:,.2f}" if wallet else "no wallet"
        print(f"  {user.full_name} ({user.email})")
        print(f"    Loans:          {len(loans)}")
        print(f"    Repayments:     {len(repayments)}")
        print(f"    Loan txns:      {len(loan_txns)}")
        print(f"    Current balance: {bal_str}")

        if dry_run:
            print(f"    → [DRY RUN] skipping\n")
            continue

        # Delete repayments first (FK: repayments → loans)
        for r in repayments:
            db.delete(r)
        db.flush()

        # Delete loan wallet transactions
        for t in loan_txns:
            db.delete(t)
        db.flush()

        # Delete loans
        for l in loans:
            db.delete(l)
        db.flush()

        # Recompute wallet balance from remaining transactions
        if wallet:
            remaining = (
                db.query(WalletTransaction)
                .filter(
                    WalletTransaction.wallet_id == wallet.id,
                    WalletTransaction.status == WalletTxStatus.completed,
                )
                .order_by(WalletTransaction.created_at.asc())
                .all()
            )

            balance = 0
            for t in remaining:
                if t.direction == 'credit':
                    balance += t.amount_kobo
                else:
                    balance -= t.amount_kobo
                # Update running balance on each txn
                t.balance_after_kobo = max(balance, 0)

            wallet.balance_kobo = max(balance, 0)
            db.flush()

            new_bal = f"₦{wallet.balance_kobo / 100:,.2f}"
        else:
            new_bal = "no wallet"

        print(f"    ✅ Cleared · New balance: {new_bal}\n")

        total_loans += len(loans)
        total_repayments += len(repayments)
        total_txns += len(loan_txns)

    if not dry_run:
        db.commit()
        print("=" * 55)
        print(f"✅ Reset complete")
        print(f"   {total_loans} loan(s) deleted")
        print(f"   {total_repayments} repayment(s) deleted")
        print(f"   {total_txns} wallet transaction(s) deleted")
        print()
    else:
        print("=" * 55)
        print("[DRY RUN] No changes made.\n")


# ── Seed wallet balances ──────────────────────────────────────────────────────

def seed_wallet_balance(db, email: str | None = None, amount_naira: int = 50_000):
    """
    Credit trader wallets with a test balance so they can repay loans
    immediately after disbursement without having to send real money.
    """
    print(f"\n  Seeding wallets with ₦{amount_naira:,}")
    print("=" * 55)

    query = db.query(TraderProfile).join(User, User.id == TraderProfile.user_id)
    if email:
        query = query.filter(User.email == email)
    else:
        query = query.filter(User.role == UserRole.trader)

    traders = query.all()

    for trader in traders:
        user = trader.user
        wallet = db.query(Wallet).filter(Wallet.user_id == user.id).first()

        if not wallet:
            print(f"  ⚠️  {user.email} — no wallet, skipping")
            continue

        amount_kobo = amount_naira * 100

        txn = WalletTransaction(
            wallet_id=wallet.id,
            tx_type=WalletTxType.credit_payment_received,
            amount_kobo=amount_kobo,
            direction='credit',
            balance_after_kobo=wallet.balance_kobo + amount_kobo,
            status=WalletTxStatus.completed,
            idempotency_key=generate_key("SEED"),
            description=f"Demo seed balance — ₦{amount_naira:,}",
        )
        db.add(txn)
        wallet.balance_kobo += amount_kobo

        print(f"  ✅ {user.full_name:<20} → ₦{wallet.balance_kobo / 100:,.2f}")

    db.commit()
    print()


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Reset Eko loan data for demo/testing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python reset_loans.py                          # reset all traders
  python reset_loans.py --dry-run                # preview only
  python reset_loans.py --email amaka@eko.demo   # one user
  python reset_loans.py --seed-balance           # reset + add ₦500k
  python reset_loans.py --seed-balance --seed-amount 1000000
        """
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview what would be deleted without making changes"
    )
    parser.add_argument(
        "--email", type=str, default=None,
        help="Only reset this user (e.g. amaka@eko.demo)"
    )
    parser.add_argument(
        "--seed-balance", action="store_true",
        help="After resetting, credit wallets with test balance"
    )
    parser.add_argument(
        "--seed-amount", type=int, default=500_000,
        help="How much to seed per wallet in naira (default: 500000)"
    )

    args = parser.parse_args()

    db = SessionLocal()
    try:
        reset_loans(db, dry_run=args.dry_run, email=args.email)

        if args.seed_balance and not args.dry_run:
            seed_wallet_balance(db, email=args.email, amount_naira=args.seed_amount)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

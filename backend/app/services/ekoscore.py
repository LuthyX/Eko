"""
EkoScore service — Phase 2 core.

Computes the 0-100 financial identity score from 5 weighted signals:
  1. Transaction Volume     30%  — total Squad receipts (90-day, log-scaled)
  2. Tenure & Recency       25%  — how long + how recently active
  3. Cohort Comparison      20%  — performance vs peers in same category
  4. Behavioural Stability  15%  — Isolation Forest anomaly score
  5. Identity Tier          10%  — BVN/NIN verification level

SHAP explains every signal's contribution.
Logistic Regression classifies into risk tiers A / B / C for the lender view.
"""
from __future__ import annotations

import logging
import math
import pickle
import os
from datetime import datetime, timezone, timedelta
from typing import Any

import numpy as np
import shap
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session

from app.models.user import (
    EkoScore, TraderProfile, RiskTier, IdentityTier,
)

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

WEIGHTS = {
    "transaction_volume": 0.30,
    "tenure_recency": 0.25,
    "cohort_comparison": 0.20,
    "behavioural_stability": 0.15,
    "identity_tier": 0.10,
}

IDENTITY_TIER_SCORES = {
    IdentityTier.none: 0.0,
    IdentityTier.bvn: 0.6,
    IdentityTier.nin: 0.7,
    IdentityTier.bvn_nin: 1.0,
}

# Cohort medians — sampled from EFInA/NBS distributions (NGN per 90 days)
COHORT_MEDIANS: dict[str, float] = {
    "fabric": 850_000,
    "tech_retail": 1_200_000,
    "perishables": 600_000,
    "cosmetics": 700_000,
    "electronics": 1_500_000,
    "default": 750_000,
}

MODEL_PATH = os.path.join(os.path.dirname(__file__), "ml_artifacts")

# ── Synthetic data generation ─────────────────────────────────────────────────

def generate_synthetic_transactions(
    n_traders: int = 300,
    seed: int = 42,
) -> np.ndarray:
    """
    Generate synthetic Squad transaction sequences for training.
    Each row: [total_volume_90d, days_since_first_tx, days_since_last_tx,
               tx_count_90d, avg_tx_amount, std_tx_amount]
    Distributions sampled to match EFInA/NBS informal sector benchmarks.
    """
    rng = np.random.default_rng(seed)

    # Normal traders
    normal_volume = rng.lognormal(mean=13.5, sigma=1.2, size=n_traders)
    normal_tenure = rng.uniform(30, 730, size=n_traders)
    normal_recency = rng.uniform(0, 14, size=n_traders)
    normal_count = rng.integers(5, 120, size=n_traders)
    normal_avg = normal_volume / normal_count
    normal_std = normal_avg * rng.uniform(0.1, 0.5, size=n_traders)

    data = np.column_stack([
        normal_volume,
        normal_tenure,
        normal_recency,
        normal_count,
        normal_avg,
        normal_std,
    ])
    return data


# ── Model training ────────────────────────────────────────────────────────────

def train_models(force: bool = False) -> tuple[IsolationForest, LogisticRegression, StandardScaler]:
    """
    Train and persist the Isolation Forest + Logistic Regression models.
    Loads from disk if already trained (skip retrain on every startup).
    """
    os.makedirs(MODEL_PATH, exist_ok=True)
    iso_path = os.path.join(MODEL_PATH, "isolation_forest.pkl")
    lr_path = os.path.join(MODEL_PATH, "risk_classifier.pkl")
    scaler_path = os.path.join(MODEL_PATH, "scaler.pkl")

    if not force and all(os.path.exists(p) for p in [iso_path, lr_path, scaler_path]):
        logger.info("Loading pre-trained EkoScore models from disk")
        with open(iso_path, "rb") as f:
            iso = pickle.load(f)
        with open(lr_path, "rb") as f:
            lr = pickle.load(f)
        with open(scaler_path, "rb") as f:
            scaler = pickle.load(f)
        return iso, lr, scaler

    logger.info("Training EkoScore models on synthetic data...")
    data = generate_synthetic_transactions(n_traders=300)

    scaler = StandardScaler()
    data_scaled = scaler.fit_transform(data)

    # Isolation Forest — behavioural stability signal
    iso = IsolationForest(
        n_estimators=100,
        contamination=0.05,   # ~5% of traders expected to have anomalous patterns
        random_state=42,
    )
    iso.fit(data_scaled)

    # Logistic Regression — risk tier classifier (A/B/C)
    # Generate synthetic labels: score > 70 = A, 50-70 = B, < 50 = C
    raw_scores = _compute_raw_scores_batch(data, iso, scaler)
    labels = np.where(raw_scores > 70, 0, np.where(raw_scores > 50, 1, 2))  # 0=A, 1=B, 2=C

    lr = LogisticRegression(max_iter=500, random_state=42)
    lr.fit(data_scaled, labels)

    # Persist
    with open(iso_path, "wb") as f:
        pickle.dump(iso, f)
    with open(lr_path, "wb") as f:
        pickle.dump(lr, f)
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)

    logger.info("EkoScore models trained and saved.")
    return iso, lr, scaler


def _compute_raw_scores_batch(data: np.ndarray, iso: IsolationForest, scaler: StandardScaler) -> np.ndarray:
    """Compute composite scores for a batch (used during training for label generation)."""
    scores = []
    for row in data:
        vol, tenure, recency, count, avg, std = row
        cohort_median = COHORT_MEDIANS["default"]

        s_vol = min(math.log1p(vol) / math.log1p(2_000_000), 1.0)
        s_tenure = min(tenure / 365, 1.0) * 0.6 + max(0, 1 - recency / 30) * 0.4
        s_cohort = min(vol / cohort_median, 2.0) / 2.0
        row_scaled = scaler.transform([row])
        anomaly_score = iso.score_samples(row_scaled)[0]
        s_stability = float(np.clip((anomaly_score + 0.5) / 0.5, 0, 1))
        s_identity = 0.6  # assume BVN for batch

        composite = (
            s_vol * WEIGHTS["transaction_volume"] +
            s_tenure * WEIGHTS["tenure_recency"] +
            s_cohort * WEIGHTS["cohort_comparison"] +
            s_stability * WEIGHTS["behavioural_stability"] +
            s_identity * WEIGHTS["identity_tier"]
        ) * 100

        scores.append(composite)
    return np.array(scores)


# ── Singleton model cache ─────────────────────────────────────────────────────

_models: tuple | None = None

def get_models() -> tuple[IsolationForest, LogisticRegression, StandardScaler]:
    global _models
    if _models is None:
        _models = train_models()
    return _models


# ── Core scoring function ─────────────────────────────────────────────────────

def compute_ekoscore(
    trader: TraderProfile,
    transactions: list[dict],  # list of {amount: int, created_at: datetime}
    db: Session,
) -> EkoScore:
    """
    Main entry point. Computes EkoScore for a trader from their transaction history.
    Persists the result and returns the EkoScore ORM object.
    """
    iso, lr, scaler = get_models()

    if not transactions:
        return _cold_start_score(trader, db)

    # ── Extract features ──────────────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    ninety_days_ago = now - timedelta(days=90)

    amounts = [t["amount"] for t in transactions]
    dates = [t["created_at"] for t in transactions]

    recent_amounts = [
        t["amount"] for t in transactions
        if t["created_at"] >= ninety_days_ago
    ]

    total_volume_90d = sum(recent_amounts) if recent_amounts else 0
    tx_count_90d = len(recent_amounts)
    avg_tx = np.mean(amounts) if amounts else 0
    std_tx = np.std(amounts) if len(amounts) > 1 else 0

    first_tx = min(dates)
    last_tx = max(dates)
    tenure_days = (now - first_tx).days
    recency_days = (now - last_tx).days

    features = np.array([[
        total_volume_90d,
        tenure_days,
        recency_days,
        tx_count_90d,
        avg_tx,
        std_tx,
    ]])
    features_scaled = scaler.transform(features)

    # ── Signal 1: Transaction Volume (30%) ────────────────────────────────────
    s_volume = min(math.log1p(total_volume_90d) / math.log1p(2_000_000), 1.0)

    # ── Signal 2: Tenure & Recency (25%) ─────────────────────────────────────
    s_tenure_raw = min(tenure_days / 365, 1.0)
    s_recency_raw = max(0.0, 1.0 - recency_days / 30)
    s_tenure_recency = s_tenure_raw * 0.6 + s_recency_raw * 0.4

    # ── Signal 3: Cohort Comparison (20%) ────────────────────────────────────
    category = trader.business_category or "default"
    cohort_median = COHORT_MEDIANS.get(category, COHORT_MEDIANS["default"])
    s_cohort = min(total_volume_90d / cohort_median, 2.0) / 2.0

    # ── Signal 4: Behavioural Stability / Isolation Forest (15%) ─────────────
    anomaly_score = iso.score_samples(features_scaled)[0]
    # score_samples returns negative values; more negative = more anomalous
    # map [-0.5, 0] → [0, 1] (clipped)
    s_stability = float(np.clip((anomaly_score + 0.5) / 0.5, 0.0, 1.0))

    # ── Signal 5: Identity Tier (10%) ────────────────────────────────────────
    s_identity = IDENTITY_TIER_SCORES.get(trader.user.identity_tier, 0.0)

    # ── Composite score ───────────────────────────────────────────────────────
    composite = (
        s_volume * WEIGHTS["transaction_volume"] +
        s_tenure_recency * WEIGHTS["tenure_recency"] +
        s_cohort * WEIGHTS["cohort_comparison"] +
        s_stability * WEIGHTS["behavioural_stability"] +
        s_identity * WEIGHTS["identity_tier"]
    ) * 100

    composite = round(float(np.clip(composite, 0, 100)), 2)

    # ── SHAP values ───────────────────────────────────────────────────────────
    shap_values = _compute_shap(features_scaled, iso)

    # ── Risk tier ─────────────────────────────────────────────────────────────
    risk_label = lr.predict(features_scaled)[0]
    risk_tier = [RiskTier.A, RiskTier.B, RiskTier.C][int(risk_label)]

    # ── Persist ───────────────────────────────────────────────────────────────
    score_record = EkoScore(
        trader_id=trader.id,
        score=composite,
        risk_tier=risk_tier,
        transaction_volume_score=round(s_volume * 100, 2),
        tenure_recency_score=round(s_tenure_recency * 100, 2),
        cohort_comparison_score=round(s_cohort * 100, 2),
        behavioural_stability_score=round(s_stability * 100, 2),
        identity_tier_score=round(s_identity * 100, 2),
        shap_values=shap_values,
        is_cold_start=False,
    )
    db.add(score_record)
    db.commit()
    db.refresh(score_record)

    logger.info(f"EkoScore computed: trader={trader.id} score={composite} tier={risk_tier}")
    return score_record


# ── Cold start ────────────────────────────────────────────────────────────────

def _cold_start_score(trader: TraderProfile, db: Session) -> EkoScore:
    """
    New trader with zero transaction history.
    Assign starting score from identity tier + business category cohort median baseline.
    Advance threshold (60) is unreachable — cold-start users see savings and matching only.
    """
    s_identity = IDENTITY_TIER_SCORES.get(trader.user.identity_tier, 0.0)
    category = trader.business_category or "default"

    # Category baseline: scale cohort median to a 0-1 score
    cohort_median = COHORT_MEDIANS.get(category, COHORT_MEDIANS["default"])
    # New trader gets 40% of the category baseline as their starting point
    s_cohort_baseline = 0.40

    cold_score = (
        s_identity * WEIGHTS["identity_tier"] +
        s_cohort_baseline * (WEIGHTS["cohort_comparison"] + WEIGHTS["transaction_volume"])
    ) * 100

    cold_score = round(float(np.clip(cold_score, 0, 55)), 2)  # hard cap at 55 — below credit threshold

    shap_values = {
        "transaction_volume": {"value": 0.0, "contribution": 0.0, "weight": WEIGHTS["transaction_volume"]},
        "tenure_recency": {"value": 0.0, "contribution": 0.0, "weight": WEIGHTS["tenure_recency"]},
        "cohort_comparison": {"value": round(s_cohort_baseline * 100, 2), "contribution": round(s_cohort_baseline * WEIGHTS["cohort_comparison"] * 100, 2), "weight": WEIGHTS["cohort_comparison"]},
        "behavioural_stability": {"value": 0.0, "contribution": 0.0, "weight": WEIGHTS["behavioural_stability"]},
        "identity_tier": {"value": round(s_identity * 100, 2), "contribution": round(s_identity * WEIGHTS["identity_tier"] * 100, 2), "weight": WEIGHTS["identity_tier"]},
    }

    score_record = EkoScore(
        trader_id=trader.id,
        score=cold_score,
        risk_tier=RiskTier.C,
        transaction_volume_score=0.0,
        tenure_recency_score=0.0,
        cohort_comparison_score=round(s_cohort_baseline * 100, 2),
        behavioural_stability_score=0.0,
        identity_tier_score=round(s_identity * 100, 2),
        shap_values=shap_values,
        is_cold_start=True,
    )
    db.add(score_record)
    db.commit()
    db.refresh(score_record)

    logger.info(f"Cold-start EkoScore: trader={trader.id} score={cold_score}")
    return score_record


# ── SHAP computation ──────────────────────────────────────────────────────────

def _compute_shap(features_scaled: np.ndarray, iso: IsolationForest) -> dict[str, Any]:
    """
    Compute SHAP values for the Isolation Forest.
    Returns a dict keyed by signal name with value, contribution, and weight.
    """
    try:
        explainer = shap.TreeExplainer(iso)
        shap_vals = explainer.shap_values(features_scaled)
        raw = shap_vals[0].tolist()
    except Exception as e:
        logger.warning(f"SHAP computation failed, using zeros: {e}")
        raw = [0.0] * 6

    # Map the 6 feature SHAP values back to our 5 named signals
    # Features: [total_volume_90d, tenure_days, recency_days, tx_count_90d, avg_tx, std_tx]
    signal_shap = {
        "transaction_volume": raw[0],
        "tenure_recency": (raw[1] + raw[2]) / 2,
        "cohort_comparison": raw[3],
        "behavioural_stability": (raw[4] + raw[5]) / 2,
        "identity_tier": 0.0,  # not an IF feature — no SHAP value
    }

    return {
        signal: {
            "shap_value": round(v, 4),
            "weight": WEIGHTS[signal],
            "label": signal.replace("_", " ").title(),
        }
        for signal, v in signal_shap.items()
    }
# ── Query helpers ─────────────────────────────────────────────────────────────

def get_latest_score(trader_id: int, db: Session) -> EkoScore | None:
    return (
        db.query(EkoScore)
        .filter(EkoScore.trader_id == trader_id)
        .order_by(EkoScore.computed_at.desc())
        .first()
    )


def get_score_history(trader_id: int, db: Session, limit: int = 30) -> list[EkoScore]:
    return (
        db.query(EkoScore)
        .filter(EkoScore.trader_id == trader_id)
        .order_by(EkoScore.computed_at.desc())
        .limit(limit)
        .all()
    )

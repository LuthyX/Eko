from datetime import datetime
from pydantic import BaseModel
from app.models.user import RiskTier


class ShapSignal(BaseModel):
    shap_value: float
    weight: float
    label: str


class EkoScoreResponse(BaseModel):
    id: int
    trader_id: int
    score: float
    risk_tier: RiskTier
    is_cold_start: bool
    computed_at: datetime

    # Raw signal scores (0–100 scaled)
    transaction_volume_score: float | None
    tenure_recency_score: float | None
    cohort_comparison_score: float | None
    behavioural_stability_score: float | None
    identity_tier_score: float | None

    # SHAP breakdown
    shap_values: dict | None

    # Derived fields
    credit_eligible: bool
    max_advance_ngn: int | None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_extended(cls, record):
        eligible = record.score >= 60 and not record.is_cold_start
        # Advance = up to 40% of estimated monthly revenue
        # We approximate from transaction_volume_score
        vol_raw = record.transaction_volume_score or 0
        monthly_est = int((vol_raw / 100) * 2_000_000 / 3)  # 90d → monthly
        max_advance = int(monthly_est * 0.4) if eligible else None

        return cls(
            id=record.id,
            trader_id=record.trader_id,
            score=record.score,
            risk_tier=record.risk_tier,
            is_cold_start=record.is_cold_start,
            computed_at=record.computed_at,
            transaction_volume_score=record.transaction_volume_score,
            tenure_recency_score=record.tenure_recency_score,
            cohort_comparison_score=record.cohort_comparison_score,
            behavioural_stability_score=record.behavioural_stability_score,
            identity_tier_score=record.identity_tier_score,
            shap_values=record.shap_values,
            credit_eligible=eligible,
            max_advance_ngn=max_advance,
        )


class EkoScoreHistoryItem(BaseModel):
    score: float
    risk_tier: RiskTier
    is_cold_start: bool
    computed_at: datetime

    model_config = {"from_attributes": True}


class CohortStatsResponse(BaseModel):
    category: str
    median_volume_ngn: int
    sample_size: int


class ComputeScoreRequest(BaseModel):
    """
    For the demo and tests — pass transaction history directly.
    In production this would be fetched live from Squad API.
    """
    transactions: list[dict]  # [{amount: int, created_at: "ISO datetime str"}]
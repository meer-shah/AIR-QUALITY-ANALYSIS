"""``/api/meta`` — dataset metadata plus the AQI legend."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import RepoDep
from app.core import aqi as aqi_core
from app.models.schemas import Meta

router = APIRouter(tags=["meta"])


@router.get("/meta", response_model=Meta)
def get_meta(repo: RepoDep) -> dict:
    """Return ``meta.json`` augmented with the US EPA ``aqi_scale`` legend."""
    meta = dict(repo.meta())
    meta["aqi_scale"] = aqi_core.AQI_SCALE
    return meta


@router.get("/insights")
def get_insights(repo: RepoDep) -> dict:
    """Methodology results: how each backend strategy improved the numbers.

    Combines the validation experiments (``insights.json`` — imputation-baseline
    MAE and spatial-KNN MAE-vs-k) with the imputation method breakdown stored in
    ``meta.json`` (how many values each model filled). Returned as a free-form
    dict so the ETL can extend it without breaking the response model.
    """
    insights = dict(repo.insights())
    insights["imputation_breakdown"] = repo.meta().get("imputation", {})
    return insights

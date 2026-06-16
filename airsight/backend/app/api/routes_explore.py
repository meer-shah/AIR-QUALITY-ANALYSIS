"""``/api/explore`` (EDA analytics) and the flag-aware time series."""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import RepoDep

router = APIRouter(tags=["explore"])


@router.get("/explore")
def explore(repo: RepoDep) -> dict:
    """Precomputed exploratory analytics: correlation, distributions, box-plots,
    diurnal/weekly profiles, and a scatter sample (from ``explore.json``)."""
    return repo.explore()


@router.get("/timeseries/flagged")
def timeseries_flagged(
    repo: RepoDep,
    station: str = Query("all"),
    pollutant: str = Query("PM2.5"),
    freq: str = Query("daily", pattern="^(daily|monthly)$"),
) -> dict:
    """Time series with the share of imputed hours per point (real-vs-imputed overlay)."""
    points = repo.flagged_timeseries(station, pollutant, freq)
    unit = next((p["unit"] for p in repo.meta().get("pollutants", []) if p["key"] == pollutant), "µg/m³")
    return {"station": station, "pollutant": pollutant, "unit": unit, "freq": freq, "points": points}

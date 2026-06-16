"""``/api/history`` — continuous air-quality history (2022 → now) for a location."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.services.history_service import SUPPORTED, HistoryDataError, get_history

router = APIRouter(tags=["history"])


@router.get("/history")
def history(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    pollutant: str = Query("PM2.5"),
    freq: str = Query("monthly", pattern="^(daily|monthly)$"),
) -> dict:
    """Continuous Open-Meteo series for a point, from ~2022-09 to today.

    Pairs with the 2021 RMCAB series so the UI can draw one continuous timeline.
    Returns ``400`` for an unsupported pollutant and ``503`` if the upstream
    archive is unreachable.
    """
    try:
        return get_history(lat, lon, pollutant, freq)
    except HistoryDataError as exc:
        # Unsupported pollutant -> 400; upstream failure -> 503.
        if pollutant not in SUPPORTED:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        raise HTTPException(status_code=503, detail=str(exc)) from exc

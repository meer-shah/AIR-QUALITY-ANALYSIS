"""Time-series endpoint (``/api/timeseries``) for one station or the whole city."""
from __future__ import annotations

from app.data.repository import POLLUTANTS, DataRepository


def _unit_for(repo: DataRepository, pollutant: str) -> str:
    """Unit string for a pollutant key (falls back to µg/m³)."""
    for p in repo.meta().get("pollutants", []):
        if p["key"] == pollutant:
            return p["unit"]
    return "µg/m³"


def build_timeseries(
    repo: DataRepository,
    station: str = "all",
    pollutant: str = "PM2.5",
    freq: str = "daily",
) -> dict:
    """Build the ``/api/timeseries`` payload.

    ``station`` is a station code or ``"all"`` (city mean per date). ``freq`` is
    ``daily`` or ``monthly``. Unknown pollutants fall back to PM2.5; any other
    ``freq`` value is treated as ``daily``.
    """
    if pollutant not in POLLUTANTS:
        pollutant = "PM2.5"
    if freq != "monthly":
        freq = "daily"

    points = repo.timeseries(station, pollutant, freq)
    return {
        "station": station,
        "pollutant": pollutant,
        "unit": _unit_for(repo, pollutant),
        "points": points,
    }

"""
Station ranking (``/api/ranking``).

Stations are ranked by the requested pollutant's period mean, highest first.
Each row also carries the station's PM2.5/PM10-based AQI so the frontend can
colour the bars consistently with the rest of the app.
"""
from __future__ import annotations

from app.core import aqi as aqi_core
from app.data.repository import POLLUTANTS, DataRepository


def _unit_for(repo: DataRepository, pollutant: str) -> str:
    """Unit string for a pollutant key (falls back to µg/m³)."""
    for p in repo.meta().get("pollutants", []):
        if p["key"] == pollutant:
            return p["unit"]
    return "µg/m³"


def build_ranking(
    repo: DataRepository, pollutant: str = "PM2.5", period: str = "annual"
) -> dict:
    """Build the ``/api/ranking`` payload, sorted by value descending."""
    if pollutant not in POLLUTANTS:
        pollutant = "PM2.5"
    unit = _unit_for(repo, pollutant)

    items: list[dict] = []
    for st in repo.stations():
        code = st["code"]
        value = repo.station_period_value(code, pollutant, period)
        # AQI badge from the station's PM2.5/PM10 means (consistent across views).
        pm25 = repo.station_period_value(code, "PM2.5", period)
        pm10 = repo.station_period_value(code, "PM10", period)
        a = aqi_core.aqi_from_concentrations(pm25, pm10)
        items.append(
            {
                "code": code,
                "name": st["name"],
                "value": value,
                "aqi": a["value"],
                "category": a["category"],
                "color": a["color"],
            }
        )

    # Sort by value descending; stations with no value sink to the bottom.
    items.sort(key=lambda i: (i["value"] is not None, i["value"] or 0.0), reverse=True)
    return {"pollutant": pollutant, "unit": unit, "items": items}

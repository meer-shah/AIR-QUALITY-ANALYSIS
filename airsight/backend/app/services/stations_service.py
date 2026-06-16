"""
Station endpoints: the list view (``/api/stations``) and the detail view
(``/api/stations/{code}``).

Each station's AQI is derived from its PM2.5 (+PM10) period means, regardless of
which pollutant is being displayed, so the AQI badge is always meaningful.
"""
from __future__ import annotations

from typing import Optional

from app.core import aqi as aqi_core
from app.data.repository import POLLUTANTS, DataRepository


def _unit_for(repo: DataRepository, pollutant: str) -> str:
    """Return the unit string for a pollutant key (falls back to µg/m³)."""
    for p in repo.meta().get("pollutants", []):
        if p["key"] == pollutant:
            return p["unit"]
    return "µg/m³"


def _label_for(repo: DataRepository, pollutant: str) -> str:
    """Return the human label for a pollutant key (falls back to the key)."""
    for p in repo.meta().get("pollutants", []):
        if p["key"] == pollutant:
            return p["label"]
    return pollutant


def _station_aqi(repo: DataRepository, code: str, period: str) -> aqi_core.Aqi:
    """AQI for a station from its PM2.5/PM10 period means."""
    pm25 = repo.station_period_value(code, "PM2.5", period)
    pm10 = repo.station_period_value(code, "PM10", period)
    return aqi_core.aqi_from_concentrations(pm25, pm10)


def list_stations(
    repo: DataRepository, pollutant: str = "PM2.5", period: str = "annual"
) -> dict:
    """Build the ``/api/stations`` payload for a pollutant/period."""
    if pollutant not in POLLUTANTS:
        pollutant = "PM2.5"
    unit = _unit_for(repo, pollutant)

    summaries: list[dict] = []
    for st in repo.stations():
        code = st["code"]
        value = repo.station_period_value(code, pollutant, period)
        summaries.append(
            {
                "code": code,
                "name": st["name"],
                "lat": st.get("lat"),
                "lon": st.get("lon"),
                "locality": st.get("locality", ""),
                "zone": st.get("zone", ""),
                "type": st.get("type", ""),
                "value": value,
                "unit": unit,
                "aqi": _station_aqi(repo, code, period),
            }
        )

    return {"pollutant": pollutant, "unit": unit, "stations": summaries}


def station_detail(
    repo: DataRepository, code: str, pollutant: str = "PM2.5", period: str = "annual"
) -> Optional[dict]:
    """Build the ``/api/stations/{code}`` payload, or ``None`` if unknown."""
    st = repo.station(code)
    if st is None:
        return None
    if pollutant not in POLLUTANTS:
        pollutant = "PM2.5"

    unit = _unit_for(repo, pollutant)
    value = repo.station_period_value(code, pollutant, period)

    # Per-pollutant period means with WHO guidelines, in canonical order.
    pollutants: list[dict] = []
    for p in POLLUTANTS:
        pollutants.append(
            {
                "key": p,
                "label": _label_for(repo, p),
                "unit": _unit_for(repo, p),
                "mean": repo.station_period_value(code, p, period),
                "whoGuideline": aqi_core.WHO_GUIDELINES.get(p),
            }
        )

    return {
        "code": code,
        "name": st["name"],
        "lat": st.get("lat"),
        "lon": st.get("lon"),
        "locality": st.get("locality", ""),
        "zone": st.get("zone", ""),
        "type": st.get("type", ""),
        "value": value,
        "unit": unit,
        "aqi": _station_aqi(repo, code, period),
        "altitude_m": st.get("altitude_m"),
        "address": st.get("address", ""),
        "records": int(st.get("records", 0)),
        "pollutants": pollutants,
        "imputed_share": st.get("imputed_share", {}),
    }

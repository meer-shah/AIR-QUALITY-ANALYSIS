"""
The dashboard overview (``/api/overview``).

Aggregates the whole network for 2021: a headline city AQI (from the mean of
station PM2.5 annual means), best/worst stations, the spread of stations across
AQI bands, per-pollutant city averages, and a data-quality summary built from the
imputed-share figures stored in ``stations.json``.
"""
from __future__ import annotations

from statistics import mean
from typing import Optional

from app.core import aqi as aqi_core
from app.data.repository import POLLUTANTS, DataRepository


def _avg(values: list[Optional[float]]) -> Optional[float]:
    """Mean of the non-None values, rounded to 2dp, or ``None``."""
    present = [v for v in values if v is not None]
    if not present:
        return None
    return round(mean(present), 2)


def build_overview(repo: DataRepository) -> dict:
    """Assemble the full overview payload."""
    meta = repo.meta()
    stations = repo.stations()

    # Annual per-station means for every pollutant (computed once, reused below).
    annual: dict[str, dict[str, Optional[float]]] = {}
    for st in stations:
        code = st["code"]
        annual[code] = {
            p: repo.station_period_value(code, p, "annual") for p in POLLUTANTS
        }

    pm25_values = [annual[s["code"]]["PM2.5"] for s in stations]
    pm10_values = [annual[s["code"]]["PM10"] for s in stations]

    avg_pm25 = _avg(pm25_values)
    avg_pm10 = _avg(pm10_values)

    # Headline AQI = city annual PM2.5 AQI (per the API contract). PM2.5 is the
    # health-driving pollutant for Bogotá, so the headline tracks it specifically.
    headline_aqi = aqi_core.aqi_from_concentrations(avg_pm25, None)

    # Best / worst station by annual PM2.5 (skip stations with no PM2.5 data).
    rated = [
        {"code": s["code"], "name": s["name"], "value": annual[s["code"]]["PM2.5"]}
        for s in stations
        if annual[s["code"]]["PM2.5"] is not None
    ]
    if rated:
        worst = max(rated, key=lambda r: r["value"])  # type: ignore[arg-type]
        best = min(rated, key=lambda r: r["value"])  # type: ignore[arg-type]
    else:
        empty = {"code": "", "name": "", "value": None}
        worst, best = empty, dict(empty)

    # AQI distribution: count stations per band using each station's PM2.5 AQI.
    band_counts: dict[str, int] = {b["category"]: 0 for b in aqi_core.AQI_SCALE}
    for s in stations:
        a = aqi_core.aqi_from_concentrations(
            annual[s["code"]]["PM2.5"], annual[s["code"]]["PM10"]
        )
        if a["value"] is not None:
            band_counts[a["category"]] = band_counts.get(a["category"], 0) + 1
    aqi_distribution = [
        {"category": b["category"], "color": b["color"], "count": band_counts[b["category"]]}
        for b in aqi_core.AQI_SCALE
    ]

    # Per-pollutant city averages (mean across station annual means).
    pollutant_averages: list[dict] = []
    meta_by_key = {p["key"]: p for p in meta.get("pollutants", [])}
    for p in POLLUTANTS:
        pm = meta_by_key.get(p, {"label": p, "unit": "µg/m³"})
        pollutant_averages.append(
            {
                "key": p,
                "label": pm.get("label", p),
                "unit": pm.get("unit", "µg/m³"),
                "mean": _avg([annual[s["code"]][p] for s in stations]),
                "whoGuideline": aqi_core.WHO_GUIDELINES.get(p),
            }
        )

    # Data quality: imputed share aggregated from stations.json.
    overall_shares: list[float] = []
    by_pollutant: list[dict] = []
    for p in POLLUTANTS:
        shares = [
            float(s["imputed_share"][p])
            for s in stations
            if isinstance(s.get("imputed_share"), dict) and p in s["imputed_share"]
        ]
        overall_shares.extend(shares)
        pct = round(mean(shares) * 100, 2) if shares else 0.0
        by_pollutant.append({"key": p, "pct": pct})
    overall_pct = round(mean(overall_shares) * 100, 2) if overall_shares else 0.0

    return {
        "meta": {
            "city": meta.get("city", ""),
            "year": meta.get("year", 0),
            "date_min": meta.get("date_min", ""),
            "date_max": meta.get("date_max", ""),
            "stations": meta.get("stations", len(stations)),
            "rows": meta.get("rows", 0),
        },
        "headline_aqi": headline_aqi,
        "avg_pm25": avg_pm25,
        "avg_pm10": avg_pm10,
        "worst_station": worst,
        "best_station": best,
        "aqi_distribution": aqi_distribution,
        "pollutant_averages": pollutant_averages,
        "data_quality": {
            "overall_imputed_pct": overall_pct,
            "by_pollutant": by_pollutant,
        },
    }

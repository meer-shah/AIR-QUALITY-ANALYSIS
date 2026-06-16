"""
Live / real-time air quality for any location, with a plain-English
"is it OK to go out?" verdict.

This is the *current-conditions* companion to the historical RMCAB analysis. It
calls the free, key-less **Open-Meteo Air Quality API** (global, hourly, CORS-
friendly) using only the Python standard library, then maps the US AQI to the
same legend the rest of the app uses and to an activity recommendation.

We use Open-Meteo's ``us_aqi`` directly (it already applies the EPA averaging
windows) rather than recomputing it from the instantaneous concentration, which
would over-state the index. A small in-memory TTL cache keeps us polite to the
upstream and snappy for repeat lookups.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request

from app.core import aqi as aqi_core
from app.services import interpolation_service

_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality"
_TIMEOUT = 15
_CACHE_TTL = 600  # seconds
_cache: dict[tuple, tuple[float, dict]] = {}

# Open-Meteo current field -> (display label, our pollutant key for matching).
_POLLUTANTS = [
    ("pm2_5", "PM2.5", "us_aqi_pm2_5"),
    ("pm10", "PM10", "us_aqi_pm10"),
    ("nitrogen_dioxide", "NO₂", "us_aqi_nitrogen_dioxide"),
    ("ozone", "Ozone", "us_aqi_ozone"),
    ("carbon_monoxide", "CO", "us_aqi_carbon_monoxide"),
    ("sulphur_dioxide", "SO₂", "us_aqi_sulphur_dioxide"),
]

_CURRENT_FIELDS = ["us_aqi"] + [k for k, _, _ in _POLLUTANTS] + [s for _, _, s in _POLLUTANTS]

# Activity advice keyed by AQI category (the legend in core.aqi.AQI_SCALE).
_ADVICE = {
    "Good": ("good", "yes", "Good — enjoy the outdoors",
             "Air quality is good. It's a great time to be active outside."),
    "Moderate": ("moderate", "yes", "Moderate — fine for most",
                 "Air quality is acceptable. Unusually sensitive people may want to ease very intense or prolonged outdoor exertion."),
    "Unhealthy for sensitive groups": ("usg", "caution", "Sensitive groups, take care",
                 "Children, older adults and people with heart or lung conditions should limit prolonged or intense outdoor exertion."),
    "Unhealthy": ("unhealthy", "limit", "Unhealthy — limit time outside",
                 "Everyone may begin to feel effects. Limit prolonged outdoor exertion; sensitive groups should stay indoors."),
    "Very unhealthy": ("very_unhealthy", "no", "Very unhealthy — stay indoors",
                 "Health alert. Avoid outdoor exertion and keep windows closed where you can."),
    "Hazardous": ("hazardous", "no", "Hazardous — avoid going out",
                 "Emergency conditions. Avoid all outdoor activity."),
    "No data": ("unknown", "unknown", "No live reading",
                "Live air-quality data isn't available for this location right now."),
}


# Pollutant key -> (Open-Meteo current field, output unit, scale). CO is given in
# µg/m³ by Open-Meteo; we divide by 1000 so it matches the mg/m³ colour scale.
_MAP_FIELDS = {
    "PM2.5": ("pm2_5", "µg/m³", 1.0),
    "PM10": ("pm10", "µg/m³", 1.0),
    "NO2": ("nitrogen_dioxide", "µg/m³", 1.0),
    "OZONE": ("ozone", "µg/m³", 1.0),
    "CO": ("carbon_monoxide", "mg/m³", 0.001),
    "SO2": ("sulphur_dioxide", "µg/m³", 1.0),
}
MAP_SUPPORTED = list(_MAP_FIELDS.keys())

_map_cache: dict[str, tuple[float, dict]] = {}


class LiveDataError(RuntimeError):
    """Raised when the upstream live source can't be reached or parsed."""


def _fetch(lat: float, lon: float) -> dict:
    params = {
        "latitude": f"{lat:.4f}",
        "longitude": f"{lon:.4f}",
        "current": ",".join(_CURRENT_FIELDS),
        "hourly": "us_aqi",
        "forecast_days": "1",
        "timezone": "auto",
    }
    url = f"{_BASE}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "AirSight/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        raise LiveDataError(f"Could not reach the live air-quality service: {exc}") from exc


def _fetch_batch(coords: list[tuple[float, float]]) -> list:
    """One Open-Meteo request for many coordinates; returns a list aligned to input order."""
    lats = ",".join(f"{lat:.4f}" for lat, lon in coords)
    lons = ",".join(f"{lon:.4f}" for lat, lon in coords)
    params = {"latitude": lats, "longitude": lons, "current": ",".join(_CURRENT_FIELDS), "timezone": "auto"}
    url = f"{_BASE}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "AirSight/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        raise LiveDataError(f"Could not reach the live air-quality service: {exc}") from exc
    # A single coordinate returns an object; many return a list. Normalise to a list.
    return data if isinstance(data, list) else [data]


# Default spatial method/k for the live map — the SAME approach as the analysis
# notebook: distance-weighted K-nearest-neighbours ("estimate pollution between
# stations"), with the MAE-tuned k the validation chose (k=7).
_LIVE_METHOD = "knn"
_LIVE_K = 7


def get_live_map(
    repo,
    pollutant: str = "PM2.5",
    method: str = _LIVE_METHOD,
    k: int = _LIVE_K,
    resolution: int = 22,
) -> dict:
    """Current air quality at every station + an interpolated live surface.

    Powers the Map's real-time mode. It mirrors the notebook's "estimate pollution
    between stations" step, but for *now*: one batched Open-Meteo call for the
    station coordinates, then **distance-weighted KNN** interpolation over those
    live readings (the same method the notebook used, k tuned by MAE to 7). Live
    data is a regional CAMS model — coarser than the 2021 ground sensors — so the
    UI labels it as such.
    """
    if pollutant not in _MAP_FIELDS:
        raise LiveDataError(
            f"Pollutant {pollutant!r} is not available live (supported: {', '.join(MAP_SUPPORTED)})."
        )
    method = method if method in ("idw", "knn") else _LIVE_METHOD
    k = max(1, k)
    cache_key = f"{pollutant}:{method}:{k}"
    now = time.monotonic()
    cached = _map_cache.get(cache_key)
    if cached and now - cached[0] < _CACHE_TTL:
        return cached[1]

    field, unit, scale = _MAP_FIELDS[pollutant]
    valid = [s for s in repo.stations() if s.get("lat") is not None and s.get("lon") is not None]
    if not valid:
        raise LiveDataError("No station coordinates available.")

    data = _fetch_batch([(s["lat"], s["lon"]) for s in valid])

    stations_out: list[dict] = []
    station_values: list[dict] = []
    reading_time = None
    for st, loc in zip(valid, data):
        cur = (loc or {}).get("current", {}) or {}
        if reading_time is None:
            reading_time = cur.get("time")
        raw = cur.get(field)
        value = round(float(raw) * scale, 3) if isinstance(raw, (int, float)) else None
        us = cur.get("us_aqi")
        us = int(us) if isinstance(us, (int, float)) else None
        cat, color = aqi_core.category_for(us)
        stations_out.append(
            {
                "code": st["code"], "name": st["name"], "lat": st["lat"], "lon": st["lon"],
                "value": value, "unit": unit,
                "aqi": {"value": us, "category": cat, "color": color, "dominant": pollutant if value is not None else None},
            }
        )
        station_values.append({"code": st["code"], "name": st["name"], "lat": st["lat"], "lon": st["lon"], "value": value})

    grid = interpolation_service.grid_from_values(
        repo, station_values, pollutant, unit, method, k, resolution
    )

    payload = {
        "time": reading_time,
        "source": "Open-Meteo (CAMS)",
        "pollutant": pollutant,
        "unit": unit,
        "method": method,
        "k": k,
        "stations": stations_out,
        "grid": grid,
    }
    _map_cache[cache_key] = (now, payload)
    return payload


def _advice_for(category: str) -> dict:
    level, ok, headline, detail = _ADVICE.get(category, _ADVICE["No data"])
    return {"level": level, "ok_to_go_out": ok, "headline": headline, "detail": detail}


def get_live(lat: float, lon: float) -> dict:
    """Return current air quality + a go-out verdict for ``(lat, lon)``."""
    key = (round(lat, 2), round(lon, 2))
    now = time.monotonic()
    cached = _cache.get(key)
    if cached and now - cached[0] < _CACHE_TTL:
        return cached[1]

    raw = _fetch(lat, lon)
    cur = raw.get("current", {}) or {}
    units = raw.get("current_units", {}) or {}

    aqi_value = cur.get("us_aqi")
    aqi_value = int(aqi_value) if isinstance(aqi_value, (int, float)) else None
    category, color = aqi_core.category_for(aqi_value)

    # Per-pollutant breakdown; the highest sub-index is the dominant pollutant.
    pollutants = []
    dominant = None
    dominant_sub = -1
    for field, label, sub_field in _POLLUTANTS:
        val = cur.get(field)
        sub = cur.get(sub_field)
        sub_int = int(sub) if isinstance(sub, (int, float)) else None
        pollutants.append(
            {
                "key": label,
                "label": label,
                "value": round(float(val), 1) if isinstance(val, (int, float)) else None,
                "unit": units.get(field, "µg/m³"),
                "sub_aqi": sub_int,
            }
        )
        if sub_int is not None and sub_int > dominant_sub:
            dominant_sub, dominant = sub_int, label

    # Compact same-day forecast (hourly US AQI).
    hourly = raw.get("hourly", {}) or {}
    times = hourly.get("time", []) or []
    aqis = hourly.get("us_aqi", []) or []
    forecast = [
        {"time": t, "aqi": int(a) if isinstance(a, (int, float)) else None}
        for t, a in zip(times, aqis)
    ]

    payload = {
        "lat": lat,
        "lon": lon,
        "time": cur.get("time"),
        "timezone": raw.get("timezone"),
        "source": "Open-Meteo",
        "aqi": {"value": aqi_value, "category": category, "color": color, "dominant": dominant},
        "advice": _advice_for(category),
        "pollutants": pollutants,
        "forecast": forecast,
    }
    _cache[key] = (now, payload)
    return payload

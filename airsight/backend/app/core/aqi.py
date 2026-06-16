"""
US EPA Air Quality Index (AQI) math — pure functions, no I/O.

AQI is computed from PM2.5 (24-hour breakpoints) and PM10. Each pollutant gets a
sub-index via piecewise-linear interpolation between standard breakpoints; the
higher sub-index wins and sets ``dominant`` (mirrors the API contract).

The category names/colours are the US EPA legend used purely as a data overlay
(the rest of the UI stays MarcVista violet/ink).
"""
from __future__ import annotations

from typing import Optional, TypedDict

# --- AQI category legend (matches docs/API_CONTRACT.md byte-for-byte) ---------

NO_DATA_CATEGORY = "No data"
NO_DATA_COLOR = "#9CA3AF"


class AqiBand(TypedDict):
    """One row of the AQI legend: an inclusive index range, a name and a colour."""

    lo: int
    hi: int
    category: str
    color: str


# Ordered low -> high. Used by /api/meta and by category_for().
AQI_SCALE: list[AqiBand] = [
    {"lo": 0, "hi": 50, "category": "Good", "color": "#16A34A"},
    {"lo": 51, "hi": 100, "category": "Moderate", "color": "#D97706"},
    {"lo": 101, "hi": 150, "category": "Unhealthy for sensitive groups", "color": "#EA580C"},
    {"lo": 151, "hi": 200, "category": "Unhealthy", "color": "#DC2626"},
    {"lo": 201, "hi": 300, "category": "Very unhealthy", "color": "#7C3AED"},
    {"lo": 301, "hi": 500, "category": "Hazardous", "color": "#7F1D1D"},
]

# WHO 2021 annual guideline values (µg/m³) used for the comparison badges.
WHO_GUIDELINES: dict[str, float] = {
    "PM2.5": 5.0,
    "PM10": 15.0,
    "NO2": 10.0,
    "OZONE": 60.0,
}

# Concentration -> AQI breakpoints. Each tuple is (Clo, Chi, Ilo, Ihi).
# PM2.5 uses 24-hour-average µg/m³; PM10 uses µg/m³.
_PM25_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    (0.0, 12.0, 0, 50),
    (12.1, 35.4, 51, 100),
    (35.5, 55.4, 101, 150),
    (55.5, 150.4, 151, 200),
    (150.5, 250.4, 201, 300),
    (250.5, 350.4, 301, 400),
    (350.5, 500.4, 401, 500),
]
_PM10_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    (0.0, 54.0, 0, 50),
    (55.0, 154.0, 51, 100),
    (155.0, 254.0, 101, 150),
    (255.0, 354.0, 151, 200),
    (355.0, 424.0, 201, 300),
    (425.0, 504.0, 301, 400),
    (505.0, 604.0, 401, 500),
]


class Aqi(TypedDict):
    """The AQI shape returned to clients."""

    value: Optional[int]
    category: str
    color: str
    dominant: Optional[str]


def _sub_index(concentration: Optional[float], breakpoints: list[tuple[float, float, int, int]]) -> Optional[int]:
    """Return the integer AQI sub-index for a concentration, or ``None``.

    Uses the standard linear-interpolation formula
    ``I = (Ihi - Ilo) / (Chi - Clo) * (C - Clo) + Ilo`` and rounds to an int.
    Negative or missing inputs yield ``None``; values above the top breakpoint
    are clamped to the highest band.
    """
    if concentration is None:
        return None
    try:
        c = float(concentration)
    except (TypeError, ValueError):
        return None
    if c != c or c < 0:  # NaN or negative
        return None

    for c_lo, c_hi, i_lo, i_hi in breakpoints:
        if c <= c_hi:
            # Below the first range's lower bound shouldn't happen (c_lo == 0),
            # but guard anyway so we never extrapolate downward.
            lo = max(c, c_lo)
            index = (i_hi - i_lo) / (c_hi - c_lo) * (lo - c_lo) + i_lo
            return int(round(index))

    # Above the highest breakpoint -> clamp to the top of the scale.
    return breakpoints[-1][3]


def category_for(value: Optional[int]) -> tuple[str, str]:
    """Map an AQI value to its ``(category, color)``.

    ``None`` maps to the neutral "No data" legend entry.
    """
    if value is None:
        return NO_DATA_CATEGORY, NO_DATA_COLOR
    for band in AQI_SCALE:
        if value <= band["hi"]:
            return band["category"], band["color"]
    last = AQI_SCALE[-1]
    return last["category"], last["color"]


def no_data_aqi() -> Aqi:
    """Return the neutral AQI object used when no concentration is available."""
    return {"value": None, "category": NO_DATA_CATEGORY, "color": NO_DATA_COLOR, "dominant": None}


def aqi_from_concentrations(pm25: Optional[float], pm10: Optional[float]) -> Aqi:
    """Compute the overall AQI from PM2.5 and/or PM10 concentrations.

    The higher of the two sub-indices wins and sets ``dominant``. If neither
    pollutant has a usable value, the neutral "No data" AQI is returned.
    """
    sub25 = _sub_index(pm25, _PM25_BREAKPOINTS)
    sub10 = _sub_index(pm10, _PM10_BREAKPOINTS)

    candidates: list[tuple[int, str]] = []
    if sub25 is not None:
        candidates.append((sub25, "PM2.5"))
    if sub10 is not None:
        candidates.append((sub10, "PM10"))

    if not candidates:
        return no_data_aqi()

    value, dominant = max(candidates, key=lambda pair: pair[0])
    category, color = category_for(value)
    return {"value": value, "category": category, "color": color, "dominant": dominant}

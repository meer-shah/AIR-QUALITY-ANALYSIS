"""
ETL: turn the raw RMCAB analysis CSVs into compact, app-ready artifacts.

Input  (research data already in the repo):
    estimating pollution between stations/data/full_data_with_imputed_values.csv
    airquality/data/stations_loc.csv

Output (written to backend/app/data_processed/):
    hourly.csv.gz     full hourly readings (decimal coords + imputed flags)
    daily.csv.gz      per-station daily means
    monthly.csv.gz    per-station monthly means
    stations.json     21 stations: coords, locality, zone/type, coverage, % imputed
    meta.json         date range, row count, pollutants, units, generated info

Run from the repo root or anywhere:
    python backend/scripts/build_dataset.py

This script is intentionally dependency-light (pandas only — gzip is stdlib) and
is the ONLY place that knows about the raw CSV shape. Everything downstream reads
the gzipped-CSV artifacts, so the rest of the app never touches the source files.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

# ---------------------------------------------------------------------------
# Paths. The app lives in <repo>/airsight/; the research notebooks (the raw
# source CSVs) stay one level up at <repo>/. We resolve both robustly so the
# script works no matter how deeply the app folder is nested.
# ---------------------------------------------------------------------------
APP_ROOT = Path(__file__).resolve().parents[2]          # .../airsight
OUT_DIR = APP_ROOT / "backend" / "app" / "data_processed"


def _find_notebooks_root(start: Path) -> Path:
    """Walk up until we find the folder that holds the research notebooks."""
    for cand in (start, *start.parents):
        if (cand / "airquality" / "data" / "stations_loc.csv").exists():
            return cand
    return start.parent  # sensible fallback (one level above the app)


REPO_ROOT = _find_notebooks_root(APP_ROOT)
IMPUTED_CSV = REPO_ROOT / "estimating pollution between stations" / "data" / "full_data_with_imputed_values.csv"
STATIONS_CSV = REPO_ROOT / "airquality" / "data" / "stations_loc.csv"
BOGOTA_GEOJSON = REPO_ROOT / "estimating pollution between stations" / "data" / "bogota.json"

POLLUTANTS = ["PM2.5", "PM10", "NO", "NO2", "NOX", "CO", "OZONE"]
FLAG_COLS = [f"{p}_imputed_flag" for p in POLLUTANTS]

# Human-readable metadata for each pollutant (units + the figure used to colour the UI).
POLLUTANT_META = {
    "PM2.5": {"label": "PM2.5", "unit": "µg/m³", "name": "Fine particulate matter"},
    "PM10": {"label": "PM10", "unit": "µg/m³", "name": "Coarse particulate matter"},
    "NO": {"label": "NO", "unit": "µg/m³", "name": "Nitric oxide"},
    "NO2": {"label": "NO2", "unit": "µg/m³", "name": "Nitrogen dioxide"},
    "NOX": {"label": "NOX", "unit": "µg/m³", "name": "Nitrogen oxides"},
    "CO": {"label": "CO", "unit": "mg/m³", "name": "Carbon monoxide"},
    "OZONE": {"label": "Ozone", "unit": "µg/m³", "name": "Ground-level ozone"},
}


def parse_dms(coord: str) -> float:
    """Convert a DMS coordinate string like 4°47'01.5\"N to signed decimal degrees."""
    if not isinstance(coord, str):
        return float("nan")
    m = re.match(r"""\s*(\d+)\D+(\d+)\D+([\d.]+)\D*([NSEW])""", coord.strip())
    if not m:
        return float("nan")
    deg, minute, sec, hemi = m.groups()
    val = float(deg) + float(minute) / 60 + float(sec) / 3600
    if hemi in ("S", "W"):
        val = -val
    return round(val, 6)


def load_hourly() -> pd.DataFrame:
    print(f"Reading {IMPUTED_CSV.name} ...")
    df = pd.read_csv(IMPUTED_CSV)

    # DateTime parsing — the RMCAB export uses Colombian locale DD/MM/YYYY HH:MM.
    # We try both day-first and month-first and keep whichever parses the most rows,
    # so a wrong guess can never silently drop days >12 (e.g. "13/01/2021").
    dayfirst = pd.to_datetime(df["DateTime"], format="%d/%m/%Y %H:%M", errors="coerce")
    monthfirst = pd.to_datetime(df["DateTime"], format="%m/%d/%Y %H:%M", errors="coerce")
    if dayfirst.isna().sum() <= monthfirst.isna().sum():
        dt = dayfirst
    else:
        dt = monthfirst
    if dt.isna().mean() > 0.5:  # last resort: let pandas infer, day-first
        dt = pd.to_datetime(df["DateTime"], errors="coerce", dayfirst=True)
    dropped = int(dt.isna().sum())
    if dropped:
        print(f"  WARNING: {dropped} rows had unparseable DateTime and were dropped")
    df["DateTime"] = dt
    df = df.dropna(subset=["DateTime"]).sort_values(["Station", "DateTime"]).reset_index(drop=True)

    # Imputed flags. The RMCAB-derived file stores the METHOD as a string in each
    # flag cell ("interpolated" for non-target pollutants, "neural network" for the
    # target pollutant) and leaves it blank for real measurements. We keep both a
    # boolean (was this value imputed?) and the method (which strategy filled it?).
    for p in POLLUTANTS:
        fc = f"{p}_imputed_flag"
        if fc in df.columns:
            method = df[fc].astype("string").str.strip()
            is_blank = method.isna() | (method == "") | (method.str.lower() == "nan")
            df[fc] = ~is_blank
            df[f"{p}_method"] = method.where(~is_blank, other="").fillna("")
        else:
            df[fc] = False
            df[f"{p}_method"] = ""

    method_cols = [f"{p}_method" for p in POLLUTANTS]
    keep = ["DateTime", "Station", "Latitude", "Longitude", *POLLUTANTS, *FLAG_COLS, *method_cols]
    df = df[[c for c in keep if c in df.columns]]
    for p in POLLUTANTS:
        df[p] = pd.to_numeric(df[p], errors="coerce")
    df["Latitude"] = pd.to_numeric(df["Latitude"], errors="coerce")
    df["Longitude"] = pd.to_numeric(df["Longitude"], errors="coerce")
    return df


def build_stations(hourly: pd.DataFrame) -> list[dict]:
    print(f"Reading {STATIONS_CSV.name} ...")
    loc = pd.read_csv(STATIONS_CSV)
    loc.columns = [c.strip() for c in loc.columns]
    # The station-info CSV uses 'Sigla' as the short code that matches hourly['Station'].
    info_by_code = {}
    for _, r in loc.iterrows():
        code = str(r.get("Sigla", "")).strip()
        info_by_code[code] = {
            "name": str(r.get("estacion", "")).strip().replace("_", " ").title(),
            "locality": str(r.get("Localidad", "")).strip(),
            "zone": str(r.get("Tipo de zona", "")).strip(),
            "type": str(r.get("Tipo de estación", r.get("Tipo de estaciÃ³n", ""))).strip(),
            "address": str(r.get("Dirección", r.get("DirecciÃ³n", ""))).strip(),
            "altitude_m": _num(r.get("Altitud (m)")),
        }

    stations = []
    for code, g in hourly.groupby("Station"):
        info = info_by_code.get(code, {})
        n = len(g)
        imputed_share = {
            p: round(float(g[f"{p}_imputed_flag"].mean()) if f"{p}_imputed_flag" in g else 0.0, 4)
            for p in POLLUTANTS
        }
        stations.append(
            {
                "code": code,
                "name": info.get("name") or code,
                "lat": round(float(g["Latitude"].dropna().iloc[0]), 6) if g["Latitude"].notna().any() else None,
                "lon": round(float(g["Longitude"].dropna().iloc[0]), 6) if g["Longitude"].notna().any() else None,
                "locality": info.get("locality", ""),
                "zone": info.get("zone", ""),
                "type": info.get("type", ""),
                "address": info.get("address", ""),
                "altitude_m": info.get("altitude_m"),
                "records": int(n),
                "imputed_share": imputed_share,
            }
        )
    stations.sort(key=lambda s: s["code"])
    return stations


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def imputation_summary(df: pd.DataFrame) -> dict:
    """Per-pollutant breakdown of how the dataset was completed.

    Tells the 'combined models' story: how many values were measured vs filled,
    and which strategy filled them — linear interpolation (non-target pollutants)
    vs the neural network (target pollutant).
    """
    total = len(df)
    per_pollutant = []
    method_totals: dict[str, int] = {}
    for p in POLLUTANTS:
        fc, mc = f"{p}_imputed_flag", f"{p}_method"
        imputed = int(df[fc].sum()) if fc in df else 0
        methods = (
            df.loc[df[fc], mc].value_counts().to_dict() if (fc in df and mc in df) else {}
        )
        methods = {str(k): int(v) for k, v in methods.items() if str(k).strip()}
        for k, v in methods.items():
            method_totals[k] = method_totals.get(k, 0) + v
        per_pollutant.append(
            {
                "key": p,
                "observed": total - imputed,
                "imputed": imputed,
                "imputed_pct": round(100 * imputed / total, 2) if total else 0.0,
                "by_method": methods,
            }
        )
    overall_imputed = sum(pp["imputed"] for pp in per_pollutant)
    cells = total * len(POLLUTANTS)
    return {
        "total_rows": total,
        "total_cells": cells,
        "overall_imputed_cells": overall_imputed,
        "overall_imputed_pct": round(100 * overall_imputed / cells, 2) if cells else 0.0,
        "by_method_totals": method_totals,
        "per_pollutant": per_pollutant,
    }


def aggregate(hourly: pd.DataFrame, freq: str) -> pd.DataFrame:
    """Per-station mean of each pollutant at the given resample frequency."""
    out = (
        hourly.set_index("DateTime")
        .groupby("Station")[POLLUTANTS]
        .resample(freq)
        .mean()
        .reset_index()
    )
    out = out.dropna(how="all", subset=POLLUTANTS)
    out["date"] = out["DateTime"].dt.strftime("%Y-%m-%d")
    return out[["date", "Station", *POLLUTANTS]]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    hourly = load_hourly()
    print(f"  -> {len(hourly):,} hourly rows, {hourly['Station'].nunique()} stations")

    imputation = imputation_summary(hourly)
    print(f"  -> imputation: {imputation['overall_imputed_pct']}% of cells filled, methods={imputation['by_method_totals']}")

    # Gzipped CSV for station detail + interpolation. Drop the helper method columns
    # (keep only booleans) and round floats to keep the file small.
    hourly_out = hourly.drop(columns=[c for c in hourly.columns if c.endswith("_method")])
    hourly_out["DateTime"] = hourly_out["DateTime"].dt.strftime("%Y-%m-%d %H:%M")
    for p in POLLUTANTS:
        hourly_out[p] = hourly_out[p].round(3)
    hourly_out.to_csv(OUT_DIR / "hourly.csv.gz", index=False, compression="gzip")

    daily = aggregate(hourly, "D")
    for p in POLLUTANTS:
        daily[p] = daily[p].round(3)
    daily.to_csv(OUT_DIR / "daily.csv.gz", index=False, compression="gzip")

    monthly = aggregate(hourly, "MS")
    for p in POLLUTANTS:
        monthly[p] = monthly[p].round(3)
    monthly.to_csv(OUT_DIR / "monthly.csv.gz", index=False, compression="gzip")

    stations = build_stations(hourly)
    (OUT_DIR / "stations.json").write_text(json.dumps(stations, indent=2, ensure_ascii=False), encoding="utf-8")

    meta = {
        "city": "Bogotá, Colombia",
        "source": "Red de Monitoreo de Calidad del Aire de Bogotá (RMCAB)",
        "year": 2021,
        "rows": int(len(hourly)),
        "stations": len(stations),
        "date_min": hourly["DateTime"].min().strftime("%Y-%m-%d"),
        "date_max": hourly["DateTime"].max().strftime("%Y-%m-%d"),
        "pollutants": [{"key": p, **POLLUTANT_META[p]} for p in POLLUTANTS],
        "imputation": imputation,
    }
    (OUT_DIR / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

    # Copy the city-boundary GeoJSON next to the other artifacts for the map overlay.
    if BOGOTA_GEOJSON.exists():
        (OUT_DIR / "bogota.geojson").write_text(BOGOTA_GEOJSON.read_text(encoding="utf-8"), encoding="utf-8")

    print("\nArtifacts written to", OUT_DIR)
    for f in sorted(OUT_DIR.iterdir()):
        print(f"  {f.name:18} {f.stat().st_size / 1024:8.1f} KB")
    print("\nDate range:", meta["date_min"], "->", meta["date_max"])


if __name__ == "__main__":
    main()

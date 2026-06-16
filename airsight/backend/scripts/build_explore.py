"""
Precompute the EXPLORE-phase analytics from the first notebook so the app can
show them without heavy work at runtime (keeps a low-powered device / free tier
happy). Reproduces, in pure pandas/numpy:

  * Pearson correlation matrix over the 7 pollutants        (create_correlation_matrix)
  * Per-station + citywide distribution histograms          (create_histogram_plot)
  * Per-station box-plot five-number summaries              (create_boxplot)
  * A sampled scatter table for any pollutant pair          (create_scatterplot)
  * Diurnal (hour-of-day) and weekly (day-of-week) average
    profiles with ±1 std band, per station + citywide       (create_map_with_plots)

Output: backend/app/data_processed/explore.json

Run after build_dataset.py:
    python backend/scripts/build_explore.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

OUT_DIR = Path(__file__).resolve().parents[1] / "app" / "data_processed"
POLLUTANTS = ["PM2.5", "PM10", "NO", "NO2", "NOX", "CO", "OZONE"]
DOW_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
HIST_BINS = 36
SAMPLE_ROWS = 1500


def load() -> pd.DataFrame:
    df = pd.read_csv(OUT_DIR / "hourly.csv.gz", parse_dates=["DateTime"])
    df["hour"] = df["DateTime"].dt.hour
    df["dow"] = df["DateTime"].dt.day_name()
    return df


def correlation(df: pd.DataFrame) -> dict:
    corr = df[POLLUTANTS].corr(method="pearson").round(3)
    return {
        "labels": POLLUTANTS,
        "matrix": [[None if pd.isna(v) else float(v) for v in corr.loc[p]] for p in POLLUTANTS],
    }


def distributions(df: pd.DataFrame) -> dict:
    """Per-pollutant histogram: fixed bins from the global range, counts per station + all."""
    out = {}
    stations = sorted(df["Station"].unique())
    for p in POLLUTANTS:
        vals = df[p].dropna()
        if vals.empty:
            continue
        lo, hi = float(vals.quantile(0.001)), float(vals.quantile(0.999))
        if hi <= lo:
            hi = lo + 1.0
        edges = np.linspace(lo, hi, HIST_BINS + 1)
        series = {}
        all_counts, _ = np.histogram(vals.clip(lo, hi), bins=edges)
        series["all"] = all_counts.astype(int).tolist()
        for s in stations:
            sv = df.loc[df["Station"] == s, p].dropna()
            counts, _ = np.histogram(sv.clip(lo, hi), bins=edges) if not sv.empty else (np.zeros(HIST_BINS), None)
            series[s] = counts.astype(int).tolist()
        out[p] = {
            "bin_edges": [round(float(e), 2) for e in edges],
            "series": series,
        }
    return out


def boxplots(df: pd.DataFrame) -> dict:
    """Five-number summary per (pollutant, station), sorted by median (notebook-style)."""
    out = {}
    stations = sorted(df["Station"].unique())
    for p in POLLUTANTS:
        rows = []
        for s in stations:
            sv = df.loc[df["Station"] == s, p].dropna()
            if sv.empty:
                continue
            q1, med, q3 = sv.quantile([0.25, 0.5, 0.75])
            iqr = q3 - q1
            lo = max(float(sv.min()), float(q1 - 1.5 * iqr))
            hi = min(float(sv.max()), float(q3 + 1.5 * iqr))
            rows.append(
                {
                    "station": s,
                    "min": round(lo, 2),
                    "q1": round(float(q1), 2),
                    "median": round(float(med), 2),
                    "q3": round(float(q3), 2),
                    "max": round(hi, 2),
                }
            )
        rows.sort(key=lambda r: r["median"])
        out[p] = rows
    return out


def profiles(df: pd.DataFrame) -> dict:
    """Hour-of-day and day-of-week mean ±std per (pollutant, station|all)."""
    out = {}
    stations = ["all"] + sorted(df["Station"].unique())
    for p in POLLUTANTS:
        per_station = {}
        for s in stations:
            sub = df if s == "all" else df[df["Station"] == s]
            hg = sub.groupby("hour")[p]
            hourly = {
                "labels": list(range(24)),
                "mean": [_r(hg.mean().get(h)) for h in range(24)],
                "std": [_r(hg.std().get(h)) for h in range(24)],
            }
            dg = sub.groupby("dow")[p]
            weekly = {
                "labels": DOW_ORDER,
                "mean": [_r(dg.mean().get(d)) for d in DOW_ORDER],
                "std": [_r(dg.std().get(d)) for d in DOW_ORDER],
            }
            annual_mean = _r(sub[p].mean())
            per_station[s] = {"hourly": hourly, "weekly": weekly, "annual_mean": annual_mean}
        out[p] = per_station
    return out


def scatter_sample(df: pd.DataFrame, seed: int = 8765) -> dict:
    """A random sample of complete rows so the UI can scatter any pollutant pair."""
    complete = df.dropna(subset=POLLUTANTS)
    n = min(SAMPLE_ROWS, len(complete))
    sample = complete.sample(n=n, random_state=seed) if n else complete
    return {
        "pollutants": POLLUTANTS,
        "rows": [[_r(r[p], 2) for p in POLLUTANTS] for _, r in sample.iterrows()],
    }


def _r(v, nd=2):
    if v is None or (isinstance(v, float) and (np.isnan(v) or np.isinf(v))):
        return None
    try:
        return round(float(v), nd)
    except (TypeError, ValueError):
        return None


def main() -> None:
    df = load()
    print(f"Loaded {len(df):,} rows")
    explore = {
        "pollutants": POLLUTANTS,
        "stations": sorted(df["Station"].unique()),
        "correlation": correlation(df),
        "distributions": distributions(df),
        "boxplots": boxplots(df),
        "profiles": profiles(df),
        "scatter": scatter_sample(df),
    }
    path = OUT_DIR / "explore.json"
    path.write_text(json.dumps(explore, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {path}  ({path.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()

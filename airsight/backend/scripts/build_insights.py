"""
Compute the *results* that justify each backend strategy, and write them to
backend/app/data_processed/insights.json so the UI can show "how each model helped".

This reproduces — in plain numpy/pandas, no sklearn/tensorflow — the two validation
experiments from the original analysis notebooks:

  Challenge 1 — Missing-data prediction (imputation)
      Hold out a slice of REAL PM2.5 readings and measure the MAE of three
      simple imputation strategies (last-known-value, linear interpolation,
      nearest-station k=1). These are the baselines the notebook benchmarked
      before settling on the production "combined models" approach
      (linear interpolation for non-target pollutants + a neural network for
      the target pollutant).

  Challenge 2 — Estimating pollution between stations (spatial KNN)
      Leave-one-station-out cross-validation: for a sample of timestamps, hide
      one station and predict it from its neighbours (1/distance weighted),
      sweeping k. This reproduces utils.calculate_mae_for_k and reveals the
      best k — i.e. how tuning the strategy improved accuracy.

Run after build_dataset.py:
    python backend/scripts/build_insights.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

OUT_DIR = Path(__file__).resolve().parents[1] / "app" / "data_processed"
TARGET = "PM2.5"
# Stations the original notebook excluded from spatial CV (imputation was weak there).
BAD_STATIONS = {"7MA", "CSE", "COL", "MOV2"}
EARTH_R_KM = 6371.0088


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlmb = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dlmb / 2) ** 2
    return float(2 * EARTH_R_KM * np.arcsin(np.sqrt(a)))


def load() -> pd.DataFrame:
    df = pd.read_csv(OUT_DIR / "hourly.csv.gz", parse_dates=["DateTime"])
    return df


# ---------------------------------------------------------------------------
# Challenge 1 — imputation baselines on real data
# ---------------------------------------------------------------------------
def imputation_validation(df: pd.DataFrame, holdout=0.15, seed=8765) -> dict:
    rng = np.random.default_rng(seed)
    flag = f"{TARGET}_imputed_flag"
    real = df[~df[flag]].copy()

    # Cross-station table (timestamp x station) of real values for nearest-station.
    pivot = real.pivot_table(index="DateTime", columns="Station", values=TARGET, aggfunc="mean")
    coords = df.groupby("Station")[["Latitude", "Longitude"]].first()
    codes = list(pivot.columns)
    dist = {
        a: {b: (0.0 if a == b else haversine_km(*coords.loc[a], *coords.loc[b])) for b in codes}
        for a in codes
    }

    err = {"last_value": [], "linear_interp": [], "nearest_station": []}
    for s in codes:
        ss = real[real.Station == s].sort_values("DateTime").set_index("DateTime")[TARGET].dropna()
        if len(ss) < 100:
            continue
        mask = rng.random(len(ss)) < holdout
        mask[0] = mask[-1] = False  # keep endpoints so interpolation is defined
        if mask.sum() == 0:
            continue
        truth = ss.values[mask]

        gapped = ss.copy()
        gapped.iloc[mask] = np.nan
        last_v = gapped.ffill().bfill().values[mask]
        lin = gapped.interpolate(method="linear", limit_direction="both").values[mask]
        err["last_value"] += list(np.abs(last_v - truth))
        err["linear_interp"] += list(np.abs(lin - truth))

        # nearest-station k=1: predict each held-out point from the closest station
        # that has a real reading at the same timestamp.
        order = sorted([c for c in codes if c != s], key=lambda c: dist[s][c])
        held_ts = ss.index[mask]
        for ts, t in zip(held_ts, truth):
            if ts not in pivot.index:
                continue
            rowvals = pivot.loc[ts]
            pred = None
            for c in order:
                v = rowvals.get(c, np.nan)
                if pd.notna(v):
                    pred = float(v)
                    break
            if pred is not None:
                err["nearest_station"].append(abs(pred - t))

    labels = {
        "last_value": "Last known value (carry-forward)",
        "linear_interp": "Linear interpolation (in time)",
        "nearest_station": "Nearest station, k=1 (in space)",
    }
    methods = [
        {"key": k, "label": labels[k], "mae": round(float(np.mean(v)), 3), "n": len(v)}
        for k, v in err.items()
        if v
    ]
    methods.sort(key=lambda m: m["mae"])
    return {
        "challenge": "Missing-data prediction",
        "target": TARGET,
        "unit": "µg/m³",
        "holdout_pct": int(holdout * 100),
        "methods": methods,
        "best_baseline": methods[0]["key"] if methods else None,
        "production_model": {
            "label": "Combined models — linear interpolation (non-target pollutants) + neural network (target)",
            "note": "The shipped dataset was completed with this combination; the baselines above are what it was benchmarked against. The neural network is not re-trained here (it needs TensorFlow), so its MAE is reported from the original analysis, not recomputed.",
            "reported_mae": 4.08,
        },
    }


def gap_distribution(df: pd.DataFrame) -> dict:
    """How long the sensor outages were: histogram of consecutive-imputed run lengths.

    Reproduces the notebook's gap-size distribution (plot_distribution_of_gaps): a
    gap is a maximal run of imputed hours for a pollutant at one station. We bucket
    the run lengths so the UI can show "most gaps are short, a few are long".
    """
    buckets = [(1, 1, "1 h"), (2, 2, "2 h"), (3, 3, "3 h"), (4, 6, "4–6 h"),
               (7, 12, "7–12 h"), (13, 24, "13–24 h"), (25, 48, "25–48 h"), (49, 10 ** 9, "49+ h")]
    out = {}
    for p in POLLUTANTS_ALL:
        flag = f"{p}_imputed_flag"
        if flag not in df.columns:
            continue
        counts = [0] * len(buckets)
        for _, g in df.sort_values("DateTime").groupby("Station"):
            run = 0
            for v in g[flag].values:
                if v:
                    run += 1
                elif run:
                    counts[_bucket_index(run, buckets)] += 1
                    run = 0
            if run:
                counts[_bucket_index(run, buckets)] += 1
        out[p] = [{"bucket": b[2], "gaps": counts[i]} for i, b in enumerate(buckets)]
    return out


def _bucket_index(run: int, buckets) -> int:
    for i, (lo, hi, _) in enumerate(buckets):
        if lo <= run <= hi:
            return i
    return len(buckets) - 1


POLLUTANTS_ALL = ["PM2.5", "PM10", "NO", "NO2", "NOX", "CO", "OZONE"]


# ---------------------------------------------------------------------------
# Challenge 2 — spatial KNN, MAE vs k (leave-one-station-out, same timestamp)
# ---------------------------------------------------------------------------
def spatial_knn_validation(df: pd.DataFrame, step_hours=6, ks=range(1, 9)) -> dict:
    flag = f"{TARGET}_imputed_flag"
    real = df[~df[flag]]
    pivot = real.pivot_table(index="DateTime", columns="Station", values=TARGET, aggfunc="mean")
    pivot = pivot.iloc[::step_hours]  # subsample timestamps for speed
    coords = df.groupby("Station")[["Latitude", "Longitude"]].first()

    codes = [c for c in pivot.columns if c not in BAD_STATIONS]
    arr = pivot[codes].values
    n_ts, n_st = arr.shape
    dmat = np.zeros((n_st, n_st))
    for i in range(n_st):
        for j in range(n_st):
            if i != j:
                dmat[i, j] = haversine_km(*coords.loc[codes[i]], *coords.loc[codes[j]])

    by_k = []
    for k in ks:
        abs_err = []
        for ti in range(n_ts):
            row = arr[ti]
            valid = ~np.isnan(row)
            for si in range(n_st):
                if not valid[si]:
                    continue
                others = [j for j in range(n_st) if j != si and valid[j]]
                if not others:
                    continue
                others.sort(key=lambda j: dmat[si, j])
                nn = others[:k]
                w = np.array([1.0 / max(dmat[si, j], 1e-6) for j in nn])
                v = np.array([row[j] for j in nn])
                pred = float((w * v).sum() / w.sum())
                abs_err.append(abs(pred - row[si]))
        if abs_err:
            by_k.append({"k": int(k), "mae": round(float(np.mean(abs_err)), 3), "n": len(abs_err)})

    best = min(by_k, key=lambda d: d["mae"]) if by_k else None
    return {
        "challenge": "Estimating pollution between stations",
        "target": TARGET,
        "unit": "µg/m³",
        "method": "Leave-one-station-out CV, same-timestamp, 1/distance weighting",
        "excluded_stations": sorted(BAD_STATIONS),
        "timestep_hours": step_hours,
        "by_k": by_k,
        "best_k": best["k"] if best else None,
        "best_mae": best["mae"] if best else None,
    }


def main() -> None:
    df = load()
    print("Computing imputation validation (Challenge 1) ...")
    imp = imputation_validation(df)
    for m in imp["methods"]:
        print(f"    {m['label']:38} MAE={m['mae']:7.3f}  (n={m['n']})")
    print("Computing spatial KNN validation (Challenge 2) ...")
    knn = spatial_knn_validation(df)
    for d in knn["by_k"]:
        print(f"    k={d['k']}  MAE={d['mae']:7.3f}  (n={d['n']})")
    print(f"    best k = {knn['best_k']} (MAE {knn['best_mae']})")

    insights = {
        "city": "Bogotá, Colombia",
        "pipeline": [
            {
                "step": 1,
                "name": "Explore",
                "summary": "Inspect 19 RMCAB stations, 7 pollutants, hourly for 2021; quantify gaps.",
            },
            {
                "step": 2,
                "name": "Missing-data prediction",
                "summary": "Fill gaps with combined models — linear interpolation for non-target pollutants and a neural network for the target.",
            },
            {
                "step": 3,
                "name": "Estimate between stations",
                "summary": "Interpolate pollution anywhere in the city with distance-weighted KNN, tuned by MAE.",
            },
        ],
        "imputation": imp,
        "spatial_knn": knn,
        "gap_distribution": gap_distribution(df),
    }
    (OUT_DIR / "insights.json").write_text(json.dumps(insights, indent=2, ensure_ascii=False), encoding="utf-8")
    print("\nWrote", OUT_DIR / "insights.json")


if __name__ == "__main__":
    main()

# AirSight — Bogotá air quality, made legible

AirSight turns the **RMCAB 2021** air-quality measurements for Bogotá, Colombia
(19 monitoring stations · 7 pollutants · 166,440 hourly readings) into clear
charts, maps, rankings, and station-to-station estimates — with a small web UI
anyone can use, and a clean **frontend / backend** split anyone can read.

It is built on top of a data-science project that solved two problems:

1. **Missing-data prediction** *(the first challenge)* — sensors drop out, so gaps
   were filled with **combined models**: **linear interpolation** for the
   non-target pollutants and a **neural network** for the target pollutant
   (PM2.5). Together they recovered **15.6%** of all data cells.
2. **Estimating pollution between stations** — distance-weighted **KNN** lets you
   estimate pollution anywhere in the city, not just at a sensor, and draw the
   interpolated heat-map across Bogotá.

The app shows *what each strategy does and how much it helped* (real validation
numbers) on the **Methods** page.

---

## What you can do in the app

- **Dashboard** — city headline AQI, best/worst stations, per-pollutant averages
  vs WHO guidelines, and a data-quality summary.
- **Map** — every station coloured by pollutant level, the interpolated pollution
  heat-map across the city (clipped to the Bogotá boundary), and click-to-estimate.
- **Trends** — daily/monthly time series for any station (or the city average),
  with multi-station compare.
- **Stations** — sortable table + ranking, drill into any station.
- **Estimate** — pick a point (or coordinates), choose IDW or KNN, get an estimate
  with the contributing neighbours.
- **Methods** — the pipeline, the combined-models imputation, and the measured
  accuracy of each strategy (MAE comparisons, KNN k-tuning).

Seven pollutants are tracked: **PM2.5, PM10, NO, NO2, NOX, CO, OZONE**
(CO in mg/m³; the rest in µg/m³).

---

## Folder map (where is what)

```
AIR-QUALITY-ANALYSIS/
├── frontend/                 # The UI  — React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── pages/            #   one file per screen (dashboard, map, trends, …)
│       ├── components/       #   ui/ charts/ map/ layout/ — reusable pieces
│       └── lib/              #   api client, types, AQI + pollutant colour scales
├── backend/                  # The API + analysis — FastAPI (Python), layered
│   ├── app/
│   │   ├── api/              #   routers (thin HTTP layer)        ── /api/*
│   │   ├── services/         #   business logic (AQI, trends, ranking, KNN/IDW)
│   │   ├── data/             #   repository = the only thing that reads files
│   │   ├── core/             #   pure helpers (AQI math, geo, config)
│   │   └── data_processed/   #   generated, app-ready data (committed)
│   └── scripts/              #   build_dataset.py (ETL) + build_insights.py
├── marcvista/                # The design system the UI follows (brand, tokens)
├── docs/                     # API_CONTRACT.md (the frozen contract) + DEPLOY.md
├── airquality/ , estimating pollution between stations/ , solving missing values…
│                             # The original research notebooks the app is built on
├── Dockerfile, render.yaml, docker-compose.yml   # one-command free deploy
└── scripts/dev.ps1 , scripts/dev.sh              # run both servers locally
```

**Layering (SOLID):** `api → services → data (repository) → core`. Each layer only
talks to the one below it. The messy source CSVs are touched in exactly one place
(`scripts/build_dataset.py`); everything else reads the clean artifacts.

---

## Run it locally

You need **Python 3.12+** and **Node 20+**.

### Easiest: one command (starts both servers)

```powershell
# Windows PowerShell, from the repo root
./scripts/dev.ps1
```
```bash
# macOS / Linux / WSL / Git Bash, from the repo root
./scripts/dev.sh
```

Then open **http://localhost:5173**. The Vite dev server proxies `/api` to the
backend on `:8000`, so the UI and API work together with no extra config.

### Manual: two terminals

**Terminal 1 — backend (API on :8000)**
```powershell
cd backend
python -m venv .venv
./.venv/Scripts/Activate.ps1            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000     # run from inside backend/
```
API docs: http://localhost:8000/docs

**Terminal 2 — frontend (UI on :5173)**
```bash
cd frontend
npm install
npm run dev
```

### Regenerate the data (optional — artifacts are already committed)

```bash
cd backend
python scripts/build_dataset.py     # CSV -> meta.json, stations.json, *.csv.gz, bogota.geojson
python scripts/build_insights.py    # model-validation results -> insights.json
```

---

## Deploy it for free

### Option A — one service (recommended)

One Docker image builds the UI and serves it together with the API, so the whole
app is a single free deploy. The committed data artifacts make the build fast.

- **Render** — push to GitHub, "New + → Blueprint", point at this repo. `render.yaml`
  defines a free Docker web service with a `/api/health` check. Done.
- **Railway / Fly.io / Hugging Face Spaces (Docker)** — point them at the
  `Dockerfile`; they inject `$PORT`, which the container honours.
- **Local docker:** `docker compose up --build` → http://localhost:8000

### Option B — split (static UI + API)

- **Frontend** → Vercel / Netlify / GitHub Pages (build `frontend`, output `dist`).
  Set the API base / a proxy rewrite to your backend URL.
- **Backend** → Render / Railway free tier (`uvicorn app.main:app` from `backend/`).

Full host-by-host steps and env vars are in **[docs/DEPLOY.md](docs/DEPLOY.md)**.

---

## Tech & data

- **Frontend:** React 18, Vite, TypeScript, Tailwind (MarcVista preset), React
  Router, Recharts, Leaflet. **Backend:** FastAPI, pandas, numpy (no heavy ML deps
  at runtime — the data is pre-computed, so it runs comfortably on a free tier).
- **Data:** Red de Monitoreo de Calidad del Aire de Bogotá (RMCAB), 2021. Used with
  permission for the DeepLearning.AI "AI for Public Health" course.
- **AQI:** US EPA breakpoints from PM2.5 (and PM10); the green→maroon scale is a
  data legend only. Other pollutants are shown as concentrations vs WHO 2021
  guidelines. See the **Methods** page and `docs/API_CONTRACT.md` for the honest
  caveats (e.g. the neural-network MAE is reported from the original analysis, not
  recomputed in the lightweight runtime).

---

## License & data attribution

Air-quality data © RMCAB (Secretaría Distrital de Ambiente, Bogotá), used with
permission for educational use. This project is for analysis and education.

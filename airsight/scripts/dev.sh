#!/usr/bin/env bash
# AirSight — start backend (FastAPI :8000) and frontend (Vite :5173) together.
# Usage (from the repo root, macOS/Linux/WSL/Git Bash):
#   ./scripts/dev.sh
#
# Starts both servers and stops both on Ctrl+C.
set -euo pipefail

# Resolve the repo root (this script lives in <root>/scripts).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "AirSight dev: backend on :8000, frontend on :5173"

# --- Backend: create venv if needed, install deps ---------------------------
if [ ! -d "$BACKEND/.venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv "$BACKEND/.venv"
fi
PY="$BACKEND/.venv/bin/python"
"$PY" -m pip install --upgrade pip >/dev/null
"$PY" -m pip install -r "$BACKEND/requirements.txt"

# --- Data: build artifacts on first run (if not committed/present) -----------
if [ ! -f "$BACKEND/app/data_processed/meta.json" ]; then
    echo "Building data artifacts (ETL)..."
    "$PY" "$BACKEND/scripts/build_dataset.py"
fi
if [ ! -f "$BACKEND/app/data_processed/insights.json" ]; then
    echo "Computing model-validation results..."
    "$PY" "$BACKEND/scripts/build_insights.py"
fi
if [ ! -f "$BACKEND/app/data_processed/explore.json" ]; then
    echo "Computing explore analytics..."
    "$PY" "$BACKEND/scripts/build_explore.py"
fi

# --- Frontend: install node deps if needed ----------------------------------
if [ ! -d "$FRONTEND/node_modules" ]; then
    echo "Installing frontend dependencies..."
    ( cd "$FRONTEND" && { [ -f package-lock.json ] && npm ci || npm install; } )
fi

# --- Launch both and clean up on exit ---------------------------------------
pids=()
cleanup() {
    echo ""
    echo "Stopping AirSight dev servers..."
    for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT INT TERM

( cd "$BACKEND" && exec "$PY" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 ) &
pids+=($!)

( cd "$FRONTEND" && exec npm run dev ) &
pids+=($!)

echo ""
echo "Backend:  http://localhost:8000  (API + docs at /docs)"
echo "Frontend: http://localhost:5173  (proxies /api to :8000)"
echo "Press Ctrl+C to stop both."
echo ""

wait

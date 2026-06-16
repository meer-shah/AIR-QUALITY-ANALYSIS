# syntax=docker/dockerfile:1
#
# AirSight — single-image deploy (UI + API in one container).
#
# Stage 1 builds the React/Vite frontend into static files.
# Stage 2 is a lean Python runtime that serves that bundle AND the FastAPI API,
# regenerating the data artifacts at build time only if they are missing.
#
# Result: one container you can run with `docker run -p 8000:8000 airsight`,
# or deploy to any host that runs Dockerfiles (Render, Railway, HF Spaces, Fly).

# ---------------------------------------------------------------------------
# Stage 1 — build the frontend
# ---------------------------------------------------------------------------
FROM node:20-alpine AS frontend

WORKDIR /build/frontend

# Copy only the manifest first so `npm ci` is cached unless deps change.
COPY frontend/package.json frontend/package-lock.json* ./
# `npm ci` is reproducible but needs a lockfile; fall back to `npm install`.
RUN npm ci || npm install

# Now bring in the rest of the frontend source and build it.
COPY frontend/ ./
RUN npm run build
# -> produces /build/frontend/dist


# ---------------------------------------------------------------------------
# Stage 2 — Python runtime (API + static UI)
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

# Keep Python lean and predictable in containers.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

# curl is used by the container HEALTHCHECK below.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (least-frequently-changed layer) for cache reuse.
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the whole repo so build_dataset.py can find the raw research CSVs.
# .dockerignore keeps this lean (no node_modules / .venv / .git / built dist).
COPY . .

# Drop in the freshly built frontend bundle. FastAPI serves it from
# frontend/dist (resolved as backend/../frontend/dist by the settings).
COPY --from=frontend /build/frontend/dist ./frontend/dist

# Regenerate the data artifacts ONLY if they are not already committed.
# The committed artifacts make this a no-op (fast build); a clean checkout
# without them falls back to the ETL + insights using the raw CSVs in the repo.
RUN if [ ! -f backend/app/data_processed/meta.json ]; then \
        echo "data_processed artifacts missing — running ETL..." ; \
        python backend/scripts/build_dataset.py ; \
    else \
        echo "data_processed artifacts present — skipping ETL." ; \
    fi \
    && if [ ! -f backend/app/data_processed/insights.json ]; then \
        echo "insights missing — computing model-validation results..." ; \
        python backend/scripts/build_insights.py ; \
    else \
        echo "insights present — skipping validation." ; \
    fi \
    && if [ ! -f backend/app/data_processed/explore.json ]; then \
        echo "explore analytics missing — computing..." ; \
        python backend/scripts/build_explore.py ; \
    else \
        echo "explore analytics present — skipping." ; \
    fi

# Run as an unprivileged user.
RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Liveness check against the API health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://localhost:${PORT:-8000}/api/health" || exit 1

# The app imports modules as `app.*`, so it must be launched from backend/.
# Honour $PORT (Render/Railway/HF inject it); default to 8000 locally.
WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

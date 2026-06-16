"""
AirSight API application factory and entrypoint.

Wires the layered backend together:

* CORS from settings (``*`` in dev).
* All routers mounted under ``/api``.
* ``GET /api/health`` for liveness checks.
* In production, the built frontend (``frontend/dist``) is served at ``/`` with a
  single-page-app fallback so client-side routes (``/map``, ``/trends``, …) all
  resolve to ``index.html`` — without ever shadowing ``/api``.

Run directly with ``python -m app.main`` (from ``backend/``) or
``python -m backend.app.main`` (from the repo root); both start uvicorn.
``app`` is importable as ``app.main:app`` for ASGI servers.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.requests import Request
from starlette.responses import Response

from app.api import (
    routes_animation,
    routes_explore,
    routes_geo,
    routes_history,
    routes_interpolate,
    routes_live,
    routes_meta,
    routes_overview,
    routes_ranking,
    routes_stations,
    routes_timeseries,
)
from app.core.config import get_settings
from app.data.repository import get_repository

API_PREFIX = "/api"


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description="Bogotá air-quality analysis API (RMCAB 2021).",
    )

    # --- CORS --------------------------------------------------------------
    # The app is same-origin in prod (FastAPI serves the SPA) and dev uses the
    # Vite proxy, so no cookies/credentials cross origins. We therefore allow a
    # wildcard origin WITHOUT credentials — combining "*" with credentials is an
    # invalid combo that browsers reject.
    allow_all = "*" in settings.cors_origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=not allow_all,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Compress JSON/HTML responses (the EDA + animation payloads benefit most),
    # which keeps transfers light on low-bandwidth / low-power clients.
    app.add_middleware(GZipMiddleware, minimum_size=1024)

    # --- Health ------------------------------------------------------------
    @app.get(f"{API_PREFIX}/health", tags=["health"])
    def health() -> dict:
        """Liveness probe with basic dataset counts."""
        repo = get_repository()
        meta = repo.meta()
        return {
            "status": "ok",
            "rows": meta.get("rows", 0),
            "stations": meta.get("stations", len(repo.stations())),
        }

    # --- API routers (all under /api) -------------------------------------
    for module in (
        routes_meta,
        routes_stations,
        routes_overview,
        routes_timeseries,
        routes_ranking,
        routes_interpolate,
        routes_geo,
        routes_live,
        routes_history,
        routes_explore,
        routes_animation,
    ):
        app.include_router(module.router, prefix=API_PREFIX)

    # --- Frontend (production) or dev hint --------------------------------
    _mount_frontend(app, settings.frontend_dist)

    return app


def _mount_frontend(app: FastAPI, dist) -> None:
    """Serve the built SPA at ``/`` with a client-side-routing fallback.

    If ``dist`` is missing (typical in local dev where Vite serves the UI), the
    root returns a small JSON hint instead.
    """
    index_file = dist / "index.html"

    if not dist.exists() or not index_file.exists():
        @app.get("/", include_in_schema=False)
        def root_hint() -> JSONResponse:
            return JSONResponse(
                {
                    "app": "AirSight API",
                    "docs": "/docs",
                    "health": f"{API_PREFIX}/health",
                    "hint": (
                        "Frontend bundle not found. In dev, run the Vite server "
                        "and proxy /api here. In prod, build frontend/dist."
                    ),
                }
            )
        return

    # Serve hashed static assets (JS/CSS/images) straight from disk.
    assets_dir = dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/", include_in_schema=False)
    def index() -> FileResponse:
        return FileResponse(str(index_file))

    # SPA catch-all: any non-/api, non-asset path returns index.html so the
    # frontend router can take over (/map, /trends, /stations, ...).
    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str, request: Request) -> Response:
        # Never shadow the API or the OpenAPI docs.
        if (
            full_path.startswith("api")
            or full_path.startswith("docs")
            or full_path.startswith("redoc")
            or full_path.startswith("openapi")
        ):
            return JSONResponse({"detail": "Not Found"}, status_code=404)

        # If the request targets a real file under dist, serve it directly.
        candidate = (dist / full_path).resolve()
        try:
            candidate.relative_to(dist.resolve())  # guard against traversal
            if candidate.is_file():
                return FileResponse(str(candidate))
        except (ValueError, OSError):
            pass

        return FileResponse(str(index_file))


# ASGI entrypoint (uvicorn app.main:app).
app = create_app()


def main() -> None:
    """Run the development server via uvicorn."""
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()

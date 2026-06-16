"""FastAPI dependency providers shared by the routers."""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from app.data.repository import DataRepository, get_repository


def repository() -> DataRepository:
    """Provide the singleton :class:`DataRepository` to route handlers."""
    return get_repository()


# Reusable annotated dependency: ``repo: RepoDep`` in a handler signature.
RepoDep = Annotated[DataRepository, Depends(repository)]

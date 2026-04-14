from fastapi import APIRouter
from typing import Dict

router = APIRouter()


@router.get("", response_model=Dict[str, str])
@router.get("/", include_in_schema=False)
async def health_check():
    """Basic health check for infrastructure monitoring."""
    return {"status": "ok", "timestamp": "now", "code_version": "dashboard_v7_cache_bust"}


@router.get("/ready", response_model=Dict[str, str])
async def readiness_check():
    """Readiness check for Cloud Run service scaling."""
    return {"status": "ready"}

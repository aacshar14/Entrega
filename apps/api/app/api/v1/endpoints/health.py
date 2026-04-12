from fastapi import APIRouter
from typing import Dict

router = APIRouter()


@router.get("", response_model=Dict[str, str])
async def health_check():
    """Basic health check for infrastructure monitoring."""
    return {"status": "ok", "timestamp": "now"}


@router.get("/ready", response_model=Dict[str, str])
async def readiness_check():
    """Readiness check for Cloud Run service scaling."""
    return {"status": "ready"}

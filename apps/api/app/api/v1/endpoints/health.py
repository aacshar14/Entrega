from fastapi import APIRouter, Request, Depends, HTTPException
from sqlmodel import Session, text
from app.core.db import get_session

router = APIRouter()

@router.get("/ready")
async def readiness_check(db: Session = Depends(get_session)):
    """Validates that the database is reachable and accepting connections."""
    try:
        db.exec(text("SELECT 1")).one()
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database not ready: {str(e)}")

@router.get("/", status_code=200)
async def health_check(request: Request):
    """General health status of the application."""
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "name": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }

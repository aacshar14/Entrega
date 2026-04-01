from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.core.db import get_session

router = APIRouter()

@router.get("/weekly")
async def get_weekly_report(db: Session = Depends(get_session)):
    """Generates simple weekly summary for pilot user."""
    return {
        "summary": "Weekly data summary for project EntreGA",
        "deliveries": 0,
        "payments": 0.0,
        "new_customers": 0,
        "status": "ready"
    }

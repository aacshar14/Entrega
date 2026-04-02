from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles
from app.models.models import User

router = APIRouter()

@router.get("/weekly", dependencies=[Depends(require_roles(["owner"]))])
async def get_weekly_report(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Generates simple weekly summary for pilot user (owner only)."""
    return {
        "summary": "Weekly data summary for project EntreGA",
        "deliveries": 0,
        "payments": 0.0,
        "new_customers": 0,
        "status": "ready"
    }

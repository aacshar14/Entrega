from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.core.config import settings
from app.core.db import get_session
from app.models.models import SystemSetting
from pydantic import BaseModel

router = APIRouter()

class PublicConfigResponse(BaseModel):
    whatsapp_app_id: str | None
    version: str
    environment: str

@router.get("/public", response_model=PublicConfigResponse)
async def get_public_config(db: Session = Depends(get_session)):
    """
    Returns public configuration values needed by the frontend.
    Priority:
    1. Database (system_settings table)
    2. Environment Variable (fallback)
    """
    # Try fetching from DB with graceful fallback if table not yet migrated
    try:
        db_app_id = db.exec(
            select(SystemSetting.value).where(SystemSetting.key == "whatsapp_app_id")
        ).first()
    except Exception as e:
        # Fallback to env default if table doesn't exist
        db_app_id = None
    
    app_id = db_app_id or settings.WHATSAPP_APP_ID
    
    return {
        "whatsapp_app_id": app_id,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

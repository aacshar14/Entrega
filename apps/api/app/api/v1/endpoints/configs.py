from fastapi import APIRouter, Depends
from sqlmodel import Session, text
from app.core.config import settings
from app.core.db import get_session
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
    Bulletproof implementation with raw SQL and silent fallback.
    """
    app_id = settings.WHATSAPP_APP_ID # Primary fallback from Env/Config
    
    try:
        # Use raw SQL to be agnostic to model/migration state
        result = db.execute(text("SELECT value FROM system_settings WHERE key = 'whatsapp_app_id'")).first()
        if result and result[0]:
            app_id = result[0]
    except Exception:
        # If table doesn't exist yet, we silently ignore and use the fallback
        pass
    
    return {
        "whatsapp_app_id": str(app_id) if app_id else None,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

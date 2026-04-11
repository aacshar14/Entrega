from fastapi import APIRouter, Depends
from sqlmodel import Session, text
from app.core.config import settings
from app.core.db import get_session
from pydantic import BaseModel

router = APIRouter()


class PublicConfigResponse(BaseModel):
    whatsapp_app_id: str | None
    whatsapp_config_id: str | None
    version: str
    environment: str


@router.get("/public", response_model=PublicConfigResponse)
async def get_public_config(db: Session = Depends(get_session)):
    """
    Returns public configuration values needed by the frontend.
    Bulletproof implementation with raw SQL and silent fallback.
    """
    app_id = settings.WHATSAPP_APP_ID  # Primary fallback
    config_id = settings.WHATSAPP_CONFIG_ID

    try:
        # 1. Fetch App ID
        res_app = db.execute(
            text("SELECT value FROM system_settings WHERE key = 'whatsapp_app_id'")
        ).first()
        if res_app and res_app[0]:
            app_id = str(res_app[0]).strip()

        # 2. Fetch Config ID
        res_cfg = db.execute(
            text("SELECT value FROM system_settings WHERE key = 'whatsapp_config_id'")
        ).first()
        if res_cfg and res_cfg[0]:
            config_id = str(res_cfg[0]).strip()
    except Exception:
        pass

    return {
        "whatsapp_app_id": str(app_id).strip() if app_id else None,
        "whatsapp_config_id": str(config_id).strip() if config_id else None,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }

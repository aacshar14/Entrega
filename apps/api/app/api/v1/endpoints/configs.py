from fastapi import APIRouter
from app.core.config import settings
from pydantic import BaseModel

router = APIRouter()

class PublicConfigResponse(BaseModel):
    whatsapp_app_id: str | None
    version: str
    environment: str

@router.get("/public", response_model=PublicConfigResponse)
async def get_public_config():
    """
    Returns public configuration values needed by the frontend.
    This ensures the Meta App ID is always synchronized with the backend environment.
    """
    return {
        "whatsapp_app_id": settings.WHATSAPP_APP_ID,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

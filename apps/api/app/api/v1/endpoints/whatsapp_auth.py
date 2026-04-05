from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, get_active_tenant_id
from app.core.config import settings
from app.models.models import User, WhatsAppConfig
from app.core.security import encrypt_token
from app.core.logging import logger
from datetime import datetime, timedelta, timezone
from uuid import UUID
from pydantic import BaseModel
import httpx

router = APIRouter()

class MetaExchangeRequest(BaseModel):
    code: str
    waba_id: Optional[str] = None
    phone_number_id: Optional[str] = None

@router.post("/exchange")
async def exchange_meta_code(
    payload: MetaExchangeRequest,
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session)
):
    """
    Exchanges an OAuth code from Meta Embedded Signup for a Long-Lived Access Token.
    Hardened for multi-tenant production.
    """
    logger.info("WhatsApp authorization exchange started", 
                tenant_id=str(active_tenant_id), 
                user_id=str(current_user.id))

    # Meta Graph URL
    meta_url = "https://graph.facebook.com/v19.0/oauth/access_token"
    
    try:
        async with httpx.AsyncClient() as client:
            fb_response = await client.get(meta_url, params={
                "client_id": settings.WHATSAPP_APP_ID or "placeholder_app_id",
                "client_secret": settings.WHATSAPP_APP_SECRET or "placeholder_secret",
                "code": payload.code
            })
            
            if fb_response.status_code != 200:
                logger.error("Meta token exchange failed", status_code=fb_response.status_code)
                raise HTTPException(status_code=400, detail="Meta could not validate the provided code")
            
            data = fb_response.json()
            short_token = data.get("access_token")
            
            # Step 2: Handle expiration
            expires_in = data.get("expires_in", 60 * 24 * 60 * 60) # Default 60 days
            
            # Update or Create Config
            config = db.exec(
                select(WhatsAppConfig).where(WhatsAppConfig.tenant_id == active_tenant_id)
            ).first()
            
            if not config:
                config = WhatsAppConfig(tenant_id=active_tenant_id)
            
            # 🛡️ Hardening: Meta IDs from payload (provided by SDK)
            if payload.waba_id:
                config.waba_id = payload.waba_id
            if payload.phone_number_id:
                config.phone_number_id = payload.phone_number_id
            
            # 🛡️ Hardening: Encrypt token before storage
            config.encrypted_access_token = encrypt_token(short_token)
            config.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            config.onboarding_status = "verified"
            config.setup_completed = True
            
            db.add(config)
            db.commit()
            
            logger.info("WhatsApp configuration successfully hardened and saved", 
                        tenant_id=str(active_tenant_id))
            
            return {"status": "success", "setup_completed": True}

    except Exception as e:
        logger.exception("Unexpected error during WhatsApp auth exchange", error=str(e))
        raise HTTPException(status_code=500, detail="An internal error occurred during WhatsApp setup")

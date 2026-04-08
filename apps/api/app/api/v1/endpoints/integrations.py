from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, get_active_tenant_id
from app.core.config import settings
from app.models.models import User, TenantWhatsAppIntegration, Tenant
from app.core.security import encrypt_token
from app.core.logging import logger
from datetime import datetime, timezone
from uuid import UUID
from pydantic import BaseModel
from typing import Optional
import httpx

router = APIRouter()

class WhatsAppCompleteRequest(BaseModel):
    code: str
    waba_id: Optional[str] = None
    phone_number_id: Optional[str] = None
    business_name: Optional[str] = None

@router.post("/whatsapp/complete")
async def complete_whatsapp_integration(
    payload: WhatsAppCompleteRequest,
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session)
):
    """
    Handles Meta Embedded Signup completion.
    Exchanges code for long-lived token and persists to tenant_whatsapp_integrations.
    """
    logger.info("whatsapp_integration.complete_start", 
                tenant_id=str(active_tenant_id), 
                user_id=str(current_user.id))

    # Meta Graph URL for token exchange
    meta_url = "https://graph.facebook.com/v19.0/oauth/access_token"
    
    try:
        async with httpx.AsyncClient() as client:
            fb_response = await client.get(meta_url, params={
                "client_id": settings.WHATSAPP_APP_ID,
                "client_secret": settings.WHATSAPP_APP_SECRET,
                "code": payload.code
            })
            
            if fb_response.status_code != 200:
                logger.error("whatsapp_integration.token_exchange_failed", 
                             status_code=fb_response.status_code, 
                             body=fb_response.text)
                raise HTTPException(status_code=400, detail="Could not validate Meta authorization code")
            
            data = fb_response.json()
            access_token = data.get("access_token")
            
            # Find or Create Integration
            integration = db.exec(
                select(TenantWhatsAppIntegration)
                .where(TenantWhatsAppIntegration.tenant_id == active_tenant_id)
            ).first()
            
            if not integration:
                integration = TenantWhatsAppIntegration(
                    tenant_id=active_tenant_id,
                    created_by_user_id=current_user.id
                )
            
            # Update fields from payload
            if payload.waba_id:
                integration.waba_id = payload.waba_id
            if payload.phone_number_id:
                integration.phone_number_id = payload.phone_number_id
            if payload.business_name:
                integration.business_name = payload.business_name
                
            integration.access_token_encrypted = encrypt_token(access_token)
            integration.status = "connected" if integration.phone_number_id else "authorized"
            integration.updated_at = datetime.now(timezone.utc)
            
            db.add(integration)
            
            # Update tenant status flags for legacy UI support
            tenant_obj = db.get(Tenant, active_tenant_id)
            if tenant_obj:
                tenant_obj.business_whatsapp_connected = True
                tenant_obj.whatsapp_status = "connected"
                tenant_obj.updated_at = datetime.now(timezone.utc)
                db.add(tenant_obj)
                
            db.commit()
            
            logger.info("whatsapp_integration.complete_success", 
                        tenant_id=str(active_tenant_id),
                        phone_number_id=integration.phone_number_id)
            
            return {
                "status": "success", 
                "integration_id": str(integration.id),
                "setup_completed": True
            }

    except Exception as e:
        logger.exception("whatsapp_integration.complete_error", error=str(e))
        raise HTTPException(status_code=500, detail="Internal error during integration setup")

@router.get("/whatsapp/status")
async def get_whatsapp_status(
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session)
):
    """Returns current integration status for the tenant."""
    integration = db.exec(
        select(TenantWhatsAppIntegration).where(TenantWhatsAppIntegration.tenant_id == active_tenant_id)
    ).first()
    
    if not integration:
        return {"status": "disconnected"}
        
    return {
        "status": integration.status,
        "business_name": integration.business_name,
        "phone_number_id": integration.phone_number_id,
        "connected_at": integration.connected_at,
        "provider": integration.provider
    }

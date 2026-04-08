from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, get_active_tenant_id
from app.core.config import settings
from app.models.models import User, WhatsAppConfig, TenantWhatsAppIntegration, Tenant
from app.core.security import encrypt_token
from app.core.logging import logger
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field
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
                config.meta_phone_number_id = payload.phone_number_id
            
            # 🛡️ Hardening: Encrypt token before storage
            config.encrypted_access_token = encrypt_token(short_token)
            config.meta_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            
            # 🛡️ Only mark as verified if both are present
            if config.encrypted_access_token and config.meta_phone_number_id:
                config.meta_onboarding_status = "verified"
                config.setup_completed = True
            else:
                config.meta_onboarding_status = "authorized" # Missing phone_number_id info
                config.setup_completed = False
            
            db.add(config)
            db.commit()
            
            logger.info("WhatsApp configuration successfully hardened and saved", 
                        tenant_id=str(active_tenant_id))
            
            return {"status": "success", "setup_completed": True}

    except Exception as e:
        logger.exception("Unexpected error during WhatsApp auth exchange", error=str(e))
        raise HTTPException(status_code=500, detail="An internal error occurred during WhatsApp setup")

class ManualSetupRequest(BaseModel):
    waba_id: str = Field(..., min_length=5)
    phone_number_id: str = Field(..., min_length=5)
    access_token: str = Field(..., min_length=20)

@router.post("/setup/manual")
async def setup_whatsapp_manual(
    payload: ManualSetupRequest,
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session)
):
    """Surgically persist manual Meta configuration for the current tenant."""
    logger.info("whatsapp_auth.manual_setup_start", 
                tenant_id=str(active_tenant_id), 
                user_id=str(current_user.id))

    # 1. Check for cross-tenant phone_number_id collision
    existing_other = db.exec(
        select(TenantWhatsAppIntegration)
        .where(TenantWhatsAppIntegration.phone_number_id == payload.phone_number_id)
        .where(TenantWhatsAppIntegration.tenant_id != active_tenant_id)
    ).first()
    
    if existing_other:
        raise HTTPException(status_code=400, detail="This Phone Number ID is already registered to another tenant.")

    # 2. Upsert Integration record
    integration = db.exec(
        select(TenantWhatsAppIntegration).where(TenantWhatsAppIntegration.tenant_id == active_tenant_id)
    ).first()
    
    if not integration:
        integration = TenantWhatsAppIntegration(
            tenant_id=active_tenant_id,
            created_by_user_id=current_user.id
        )
    
    # 3. Securely pack and update
    integration.waba_id = payload.waba_id
    integration.phone_number_id = payload.phone_number_id
    integration.access_token_encrypted = encrypt_token(payload.access_token)
    integration.status = "connected"
    integration.updated_at = datetime.now(timezone.utc)
    
    db.add(integration)
    
    # 4. Sync Tenant status flags for legacy UI components
    tenant_obj = db.get(Tenant, active_tenant_id)
    if tenant_obj:
        tenant_obj.business_whatsapp_connected = True
        tenant_obj.whatsapp_status = "connected"
        tenant_obj.updated_at = datetime.now(timezone.utc)
        db.add(tenant_obj)
        
    db.commit()
    db.refresh(integration)
    
    logger.info("whatsapp_auth.manual_setup_success", 
                tenant_id=str(active_tenant_id),
                phone_number_id=integration.phone_number_id)
    
    return {
        "ok": True,
        "tenant_id": str(active_tenant_id),
        "status": integration.status,
        "phone_number_id": integration.phone_number_id,
        "waba_id": integration.waba_id
    }

@router.get("/setup/manual")
async def get_manual_setup_status(
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session)
):
    """Retrieve current manual configuration status for the tenant."""
    integration = db.exec(
        select(TenantWhatsAppIntegration).where(TenantWhatsAppIntegration.tenant_id == active_tenant_id)
    ).first()
    
    if not integration:
        return {"ok": False, "status": "disconnected"}
        
    return {
        "ok": True,
        "status": integration.status,
        "phone_number_id": integration.phone_number_id,
        "waba_id": integration.waba_id,
        "connected_at": integration.connected_at
    }

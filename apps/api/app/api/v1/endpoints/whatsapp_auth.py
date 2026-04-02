from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlmodel import Session, select
from uuid import UUID
import httpx
from datetime import datetime, timezone

from app.core.db import get_engine
from app.models.models import Tenant, WhatsAppConfig
from app.core.dependencies import get_active_tenant_id
from app.core.security import encrypt_token
from app.core.config import settings

router = APIRouter()

@router.get("/config")
def get_whatsapp_auth_config():
    """Returns Meta App configuration for the Embedded Signup SDK"""
    return {
        "app_id": "YOUR_META_APP_ID", # Should come from settings
        "version": "v19.0",
        "redirect_uri": f"https://{settings.DOMAIN}/api/v1/whatsapp/auth/callback"
    }

@router.post("/exchange")
async def exchange_whatsapp_code(
    code: str = Body(..., embed=True),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """
    Exchanges Meta temporary code for an Access Token and stores it securely.
    """
    # 1. Exchange code for User Access Token (S2S)
    # Note: In production, use Meta API v19.0+
    # params = {
    #     "client_id": "...",
    #     "client_secret": settings.SECRET_KEY, # Or specific app secret
    #     "code": code
    # }
    # async with httpx.AsyncClient() as client:
    #     response = await client.get("https://graph.facebook.com/v19.0/oauth/access_token", params=params)
    #     data = response.json()
    
    # MOCK Exchange for now
    mock_token = f"EAAB_MOCK_{code}"
    mock_waba_id = "1234567890"
    mock_phone_id = "0987654321"
    
    # 2. Encrypt and store
    encrypted = encrypt_token(mock_token)
    
    with Session(get_engine()) as session:
        # Update Tenant Status
        tenant = session.get(Tenant, active_tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        tenant.business_whatsapp_connected = True
        tenant.whatsapp_status = "connected"
        tenant.whatsapp_connected_at = datetime.now(timezone.utc)
        
        # Store WhatsAppConfig
        config = session.exec(select(WhatsAppConfig).where(WhatsAppConfig.tenant_id == active_tenant_id)).first()
        if not config:
            config = WhatsAppConfig(tenant_id=active_tenant_id)
            session.add(config)
        
        config.encrypted_access_token = encrypted
        config.waba_id = mock_waba_id
        config.phone_number_id = mock_phone_id
        config.display_phone_number = "+52 1 234 567 8901"
        config.whatsapp_business_account_name = f"{tenant.name} Official"
        config.updated_at = datetime.now(timezone.utc)
        
        session.commit()
        session.refresh(tenant)
        
        return {
            "status": "success",
            "business_name": config.whatsapp_business_account_name,
            "display_number": config.display_phone_number
        }

@router.get("/status")
def get_whatsapp_status(active_tenant_id: UUID = Depends(get_active_tenant_id)):
    """Returns non-sensitive metadata for the current connection"""
    with Session(get_engine()) as session:
        config = session.exec(select(WhatsAppConfig).where(WhatsAppConfig.tenant_id == active_tenant_id)).first()
        if not config:
            return {"status": "disconnected"}
        
        return {
            "status": "connected",
            "business_name": config.whatsapp_business_account_name,
            "display_number": config.display_phone_number,
            "connected_at": config.connected_at
        }

@router.delete("/disconnect")
def disconnect_whatsapp(active_tenant_id: UUID = Depends(get_active_tenant_id)):
    """Removes the connection and clears tokens"""
    with Session(get_engine()) as session:
        tenant = session.get(Tenant, active_tenant_id)
        if tenant:
            tenant.business_whatsapp_connected = False
            tenant.whatsapp_status = "disconnected"
        
        config = session.exec(select(WhatsAppConfig).where(WhatsAppConfig.tenant_id == active_tenant_id)).first()
        if config:
            session.delete(config)
        
        session.commit()
        return {"status": "disconnected"}

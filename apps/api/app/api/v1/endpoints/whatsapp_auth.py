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
        "app_id": settings.WHATSAPP_APP_ID or "YOUR_META_APP_ID",
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
    if not settings.WHATSAPP_APP_ID or not settings.WHATSAPP_APP_SECRET:
        # Fallback to mock for development if secrets are missing
        if settings.ENVIRONMENT == "development":
            return await mock_exchange(code, active_tenant_id)
        raise HTTPException(status_code=500, detail="Meta App credentials not configured")

    # 1. Exchange code for Access Token (S2S)
    params = {
        "client_id": settings.WHATSAPP_APP_ID,
        "client_secret": settings.WHATSAPP_APP_SECRET,
        "code": code
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Meta OAuth endpoint
            response = await client.get("https://graph.facebook.com/v19.0/oauth/access_token", params=params)
            response.raise_for_status()
            data = response.json()
            access_token = data.get("access_token")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to exchange code: {str(e)}")

    if not access_token:
        raise HTTPException(status_code=400, detail="No access token returned from Meta")

    # 2. Get Debug Token Info to find WABA ID and Phone ID (Optional step depending on flow)
    # For now, we expect the frontend to provide these after the SDK callback, 
    # OR we fetch them from /debug_token or similar.
    # Simplifying for Pilot: We'll perform a basic account lookup.

    # 3. Encrypt and store
    encrypted = encrypt_token(access_token)
    
    with Session(get_engine()) as session:
        tenant = session.get(Tenant, active_tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        tenant.whatsapp_status = "connected"
        tenant.business_whatsapp_connected = True
        tenant.whatsapp_connected_at = datetime.now(timezone.utc)
        
        config = session.exec(select(WhatsAppConfig).where(WhatsAppConfig.tenant_id == active_tenant_id)).first()
        if not config:
            config = WhatsAppConfig(tenant_id=active_tenant_id)
            session.add(config)
        
        config.encrypted_access_token = encrypted
        # These would ideally be fetched from Meta API using the access_token
        # For the pilot, we'll use placeholders that the user can verify in Meta Panel
        config.waba_id = "pending_auto_detect" 
        config.phone_number_id = "pending_auto_detect"
        config.updated_at = datetime.now(timezone.utc)
        
        session.commit()
        session.refresh(tenant)
        
        return {
            "status": "success",
            "message": "Conectado exitosamente con Meta"
        }

async def mock_exchange(code: str, active_tenant_id: UUID):
    """Fallback mock exchange for dev environments"""
    mock_token = f"EAAB_MOCK_{code}"
    encrypted = encrypt_token(mock_token)
    
    with Session(get_engine()) as session:
        tenant = session.get(Tenant, active_tenant_id)
        if tenant:
            tenant.whatsapp_status = "connected"
            tenant.business_whatsapp_connected = True
            
        config = session.exec(select(WhatsAppConfig).where(WhatsAppConfig.tenant_id == active_tenant_id)).first()
        if not config:
            config = WhatsAppConfig(tenant_id=active_tenant_id)
            session.add(config)
        
        config.encrypted_access_token = encrypted
        config.waba_id = "MOCK_WABA_ID"
        config.phone_number_id = "MOCK_PHONE_ID"
        session.commit()
        
    return {"status": "success", "message": "Conectado (MODO DESARROLLO)"}

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

@router.post("/setup/manual")
async def setup_whatsapp_manual(
    waba_id: str = Body(..., embed=True),
    phone_number_id: str = Body(..., embed=True),
    access_token: str = Body(..., embed=True),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """Manually configure WhatsApp Cloud API tokens for Chocobites"""
    encrypted = encrypt_token(access_token)
    
    with Session(get_engine()) as session:
        tenant = session.get(Tenant, active_tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        tenant.whatsapp_status = "connected"
        tenant.business_whatsapp_connected = True
        
        config = session.exec(select(WhatsAppConfig).where(WhatsAppConfig.tenant_id == active_tenant_id)).first()
        if not config:
            config = WhatsAppConfig(tenant_id=active_tenant_id)
            session.add(config)
            
        config.waba_id = waba_id
        config.phone_number_id = phone_number_id
        config.encrypted_access_token = encrypted
        config.updated_at = datetime.now(timezone.utc)
        
        session.commit()
        return {"status": "success", "message": "Configuración manual de Meta guardada"}

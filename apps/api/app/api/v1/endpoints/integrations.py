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
from typing import Optional, Dict, Any
import httpx

router = APIRouter()


class WhatsAppCompleteRequest(BaseModel):
    code: str
    state: str  # The secure nonce
    waba_id: Optional[str] = None
    phone_number_id: Optional[str] = None
    business_name: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@router.post("/whatsapp/complete")
async def complete_whatsapp_integration(
    payload: WhatsAppCompleteRequest,
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session),
):
    """
    Handles Meta Embedded Signup completion.
    Exchanges code for long-lived token and persists to tenant_whatsapp_integrations.
    """
    logger.info(
        "whatsapp_integration.complete_start",
        tenant_id=str(active_tenant_id),
        user_id=str(current_user.id),
    )

    # 1. Nonce Validation (Security Hook)
    integration = db.exec(
        select(TenantWhatsAppIntegration).where(
            TenantWhatsAppIntegration.tenant_id == active_tenant_id
        )
    ).first()

    if not integration or integration.onboarding_nonce != payload.state:
        logger.error(
            "whatsapp_integration.nonce_validation_failed",
            tenant_id=str(active_tenant_id),
        )
        raise HTTPException(
            status_code=403, detail="Sesión de vinculación inválida o expirada"
        )

    if integration.onboarding_nonce_expires_at and datetime.now(
        timezone.utc
    ) > integration.onboarding_nonce_expires_at.replace(tzinfo=timezone.utc):
        logger.error(
            "whatsapp_integration.nonce_expired", tenant_id=str(active_tenant_id)
        )
        raise HTTPException(
            status_code=403, detail="La sesión ha expirado. Por favor intenta de nuevo."
        )
    meta_url = "https://graph.facebook.com/v19.0/oauth/access_token"

    try:
        async with httpx.AsyncClient() as client:
            fb_response = await client.get(
                meta_url,
                params={
                    "client_id": settings.WHATSAPP_APP_ID,
                    "client_secret": settings.WHATSAPP_APP_SECRET,
                    "code": payload.code,
                },
            )

            if fb_response.status_code != 200:
                logger.error(
                    "whatsapp_integration.token_exchange_failed",
                    status_code=fb_response.status_code,
                    body=fb_response.text,
                )
                raise HTTPException(
                    status_code=400, detail="Could not validate Meta authorization code"
                )

            data = fb_response.json()
            access_token = data.get("access_token")

            # Update fields and clear security nonce
            if payload.waba_id:
                integration.waba_id = payload.waba_id
            if payload.phone_number_id:
                integration.phone_number_id = payload.phone_number_id
            if payload.business_name:
                integration.business_name = payload.business_name
            if payload.metadata:
                import json

                integration.metadata_json = json.dumps(payload.metadata)

            integration.access_token_encrypted = encrypt_token(access_token)
            integration.status = "connected"
            integration.connected_at = datetime.now(timezone.utc)
            integration.last_validated_at = datetime.now(timezone.utc)
            integration.onboarding_nonce = None
            integration.onboarding_nonce_expires_at = None
            integration.updated_at = datetime.now(timezone.utc)

            db.add(integration)
            db.commit()

            return {
                "status": "success",
                "integration_id": str(integration.id),
                "setup_completed": True,
            }

    except Exception as e:
        logger.exception("whatsapp_integration.complete_error", error=str(e))
        raise HTTPException(
            status_code=500, detail="Internal error during integration setup"
        )


@router.get("/whatsapp/onboarding-url")
def get_onboarding_url(
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session),
):
    """Generates a secure state nonce for Meta Embedded Signup (V1.4)"""
    import secrets
    from datetime import timedelta

    nonce = secrets.token_urlsafe(32)

    # Store nonce in integration record (create if missing as 'pending')
    integration = db.exec(
        select(TenantWhatsAppIntegration).where(
            TenantWhatsAppIntegration.tenant_id == active_tenant_id
        )
    ).first()

    if not integration:
        integration = TenantWhatsAppIntegration(
            tenant_id=active_tenant_id, status="pending"
        )

    integration.onboarding_nonce = nonce
    integration.onboarding_nonce_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=15
    )
    db.add(integration)
    db.commit()

    return {"nonce": nonce, "app_id": settings.WHATSAPP_APP_ID}


@router.post("/whatsapp/disconnect")
async def disconnect_whatsapp(
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session),
):
    """Soft-disables the WhatsApp integration (LifeCycle V1.4)"""
    integration = db.exec(
        select(TenantWhatsAppIntegration).where(
            TenantWhatsAppIntegration.tenant_id == active_tenant_id
        )
    ).first()

    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    integration.status = "disconnected"
    integration.disconnected_at = datetime.now(timezone.utc)
    db.add(integration)
    db.commit()

    return {"status": "success", "message": "Integración suspendida"}


@router.get("/whatsapp/status")
async def get_whatsapp_status(
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session),
):
    """Returns enriched status. Shows 'not_connected' if no record exists."""
    integration = db.exec(
        select(TenantWhatsAppIntegration).where(
            TenantWhatsAppIntegration.tenant_id == active_tenant_id
        )
    ).first()

    if not integration:
        return {"status": "not_connected"}

    return {
        "status": integration.status,
        "business_name": integration.business_name,
        "phone_number_id": integration.phone_number_id,
        "connected_at": integration.connected_at,
        "last_validated": integration.last_validated_at,
        "disconnected_at": integration.disconnected_at,
    }

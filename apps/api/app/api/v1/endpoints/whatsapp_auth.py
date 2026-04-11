from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, get_active_tenant_id
from app.core.config import settings
from app.models.models import User, TenantWhatsAppIntegration, Tenant
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
    db: Session = Depends(get_session),
):
    """
    Exchanges an OAuth code from Meta Embedded Signup for a Long-Lived Access Token.
    [DEPRECATED] Use /api/v1/integrations/whatsapp/complete instead.
    """
    logger.warning(
        "Legacy WhatsApp exchange endpoint called - REJECTING",
        tenant_id=str(active_tenant_id),
        user_id=str(current_user.id),
    )
    raise HTTPException(
        status_code=410,
        detail="This endpoint is deprecated. Please refresh your browser and use the updated onboarding flow.",
    )


class ManualSetupRequest(BaseModel):
    waba_id: str = Field(..., min_length=5)
    phone_number_id: str = Field(..., min_length=5)
    access_token: str = Field(..., min_length=20)


@router.post("/setup/manual")
async def setup_whatsapp_manual(
    payload: ManualSetupRequest,
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session),
):
    """Surgically persist manual Meta configuration for the current tenant."""
    logger.info(
        "whatsapp_auth.manual_setup_start",
        tenant_id=str(active_tenant_id),
        user_id=str(current_user.id),
    )

    # 1. Check for cross-tenant phone_number_id collision
    existing_other = db.exec(
        select(TenantWhatsAppIntegration)
        .where(TenantWhatsAppIntegration.phone_number_id == payload.phone_number_id)
        .where(TenantWhatsAppIntegration.tenant_id != active_tenant_id)
    ).first()

    if existing_other:
        raise HTTPException(
            status_code=400,
            detail="This Phone Number ID is already registered to another tenant.",
        )

    # 2. Upsert Integration record
    integration = db.exec(
        select(TenantWhatsAppIntegration).where(
            TenantWhatsAppIntegration.tenant_id == active_tenant_id
        )
    ).first()

    if not integration:
        integration = TenantWhatsAppIntegration(
            tenant_id=active_tenant_id, created_by_user_id=current_user.id
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

    logger.info(
        "whatsapp_auth.manual_setup_success",
        tenant_id=str(active_tenant_id),
        phone_number_id=integration.phone_number_id,
    )

    return {
        "ok": True,
        "tenant_id": str(active_tenant_id),
        "status": integration.status,
        "phone_number_id": integration.phone_number_id,
        "waba_id": integration.waba_id,
    }


@router.get("/setup/manual")
async def get_manual_setup_status(
    active_tenant_id: UUID = Depends(get_active_tenant_id),
    db: Session = Depends(get_session),
):
    """Retrieve current manual configuration status for the tenant."""
    integration = db.exec(
        select(TenantWhatsAppIntegration).where(
            TenantWhatsAppIntegration.tenant_id == active_tenant_id
        )
    ).first()

    if not integration:
        return {"ok": False, "status": "disconnected"}

    return {
        "ok": True,
        "status": integration.status,
        "phone_number_id": integration.phone_number_id,
        "waba_id": integration.waba_id,
        "connected_at": integration.connected_at,
    }

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import (
    get_current_user,
    get_active_membership,
    get_active_tenant,
    require_roles,
)
from app.models.models import User, Tenant, TenantUser, TenantInfo
from app.core.logging import logger
from uuid import UUID
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()


class TenantCreate(BaseModel):
    name: str
    slug: str


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    business_whatsapp_number: Optional[str] = None
    logo_url: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None


@router.post("", response_model=Tenant)
async def create_business(
    request: TenantCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    ATOMIC & IDEMPOTENT ONBOARDING (V2.3.0)
    Registers a new business, owner membership, and billing baseline in one transaction.
    """
    slug = request.slug.strip().lower()
    name = request.name.strip()

    logger.info("tenant.create_business.start", user_id=str(current_user.id), slug=slug)

    # 1. IDEMPOTENCY CHECK
    # Check if this user already successfully created THIS tenant
    existing_membership = db.exec(
        select(TenantUser, Tenant)
        .join(Tenant)
        .where(Tenant.slug == slug, TenantUser.user_id == current_user.id)
    ).first()

    if existing_membership:
        logger.info(
            "tenant.create_business.idempotent_retry",
            user_id=str(current_user.id),
            slug=slug,
            tenant_id=str(existing_membership[1].id),
        )
        return existing_membership[1]

    # 2. CONFLICT CHECK
    existing_slug = db.exec(select(Tenant).where(Tenant.slug == slug)).first()
    if existing_slug:
        logger.warning("tenant.create_business.slug_conflict", slug=slug)
        raise HTTPException(
            status_code=400, detail="El nombre de usuario o negocio ya existe"
        )

    # 3. ATOMIC EXECUTION
    try:
        # Define Billing Baseline
        now = datetime.now(timezone.utc)
        trial_duration = timedelta(days=30)

        new_tenant = Tenant(
            name=name,
            slug=slug,
            status="active",
            # Explicit Onboarding State
            onboarding_state="created",
            onboarding_step=1,
            ready=False,
            # Billing Baseline
            billing_status="trial_active",
            trial_ends_at=now + trial_duration,
            plan_code="basic_monthly",
            created_at=now,
            updated_at=now,
        )
        db.add(new_tenant)
        db.flush()  # Get ID

        # Create membership as owner
        membership = TenantUser(
            tenant_id=new_tenant.id,
            user_id=current_user.id,
            tenant_role="owner",
            is_active=True,
            is_default=True,
            created_at=now,
        )
        db.add(membership)

        db.commit()
        db.refresh(new_tenant)

        logger.info(
            "tenant.create_business.success",
            user_id=str(current_user.id),
            tenant_id=str(new_tenant.id),
            slug=slug,
        )
        return new_tenant

    except Exception as e:
        db.rollback()
        logger.error(
            "tenant.create_business.failure",
            user_id=str(current_user.id),
            slug=slug,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al crear el negocio: {str(e)}",
        )


@router.get("/active", response_model=Tenant)
async def get_active_business(tenant: Tenant = Depends(get_active_tenant)):
    """Get metadata for the currently active tenant."""
    return tenant


@router.patch("/active", response_model=Tenant)
async def update_active_business(
    request: TenantUpdate,
    db: Session = Depends(get_session),
    membership: TenantUser = Depends(get_active_membership),
):
    """
    Update metadata for the active business. 
    Triggers Onboarding State transitions.
    """
    if membership.tenant_role != "owner":
        raise HTTPException(
            status_code=403, detail="Only owners can update business settings"
        )

    tenant = db.get(Tenant, membership.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    changed = False
    if request.name is not None:
        tenant.name = request.name
        changed = True

    if request.business_whatsapp_number is not None:
        val = request.business_whatsapp_number.strip()
        tenant.business_whatsapp_number = val if val else None
        if not tenant.business_whatsapp_number:
            tenant.business_whatsapp_connected = False
        changed = True

    if request.logo_url is not None:
        tenant.logo_url = request.logo_url
        changed = True

    if request.timezone is not None:
        tenant.timezone = request.timezone
        changed = True

    if request.currency is not None:
        tenant.currency = request.currency
        changed = True

    # Deterministic Transition: Profile Completion
    if tenant.onboarding_state == "created" and tenant.timezone and tenant.currency:
        logger.info(
            "tenant.onboarding.transition",
            tenant_id=str(tenant.id),
            old_state=tenant.onboarding_state,
            new_state="profile_completed",
        )
        tenant.onboarding_state = "profile_completed"
        tenant.onboarding_step = 2

    if changed:
        tenant.updated_at = datetime.now(timezone.utc)
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

    return tenant

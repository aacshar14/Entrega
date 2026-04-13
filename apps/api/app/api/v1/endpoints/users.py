from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from sqlmodel import Session, select, func
from app.core.db import get_session
from app.core.logging import logger
from app.core.dependencies import (
    get_current_user,
    get_active_membership,
    require_roles,
    get_active_tenant_id,
)
from app.models.models import (
    User,
    Tenant,
    TenantUser,
    Customer,
    Product,
    MeResponse,
    MembershipInfo,
    TenantInfo,
    TenantWhatsAppIntegration,
)
from typing import List, Optional
from uuid import UUID

router = APIRouter()


def get_tenant_info_safe(db: Session, tenant: Tenant) -> TenantInfo:
    """
    STRICT BEST-EFFORT (V2.2.0): Resolves tenant info without ever failing the response.
    Implements mandatory fallback table for all optional metrics.
    """
    # 1. Operational "Ready" Semantics (Deterministic)
    # Target: Tenant active AND explicitly marked ready in DB.
    is_ready = tenant.ready and tenant.status == "active"

    # 2. Best-Effort Metrics (Onboarding Counters)
    has_customers = tenant.clients_imported
    has_products = tenant.stock_imported
    try:
        has_customers = (
            db.exec(
                select(func.count(Customer.id)).where(Customer.tenant_id == tenant.id)
            ).one()
            > 0
        )
        has_products = (
            db.exec(
                select(func.count(Product.id)).where(Product.tenant_id == tenant.id)
            ).one()
            > 0
        )
    except Exception as metrics_err:
        logger.warning(
            "metrics.onboarding_counts.failed",
            tenant_id=str(tenant.id),
            error=str(metrics_err),
        )

    # 3. Best-Effort WhatsApp Status
    # Defaults according to V2.2.0 Fallback Table
    wa_status = "not_connected"
    wa_display = None
    wa_acc_name = None
    wa_app_id = None
    wa_connected = False

    try:
        wa_integration = db.exec(
            select(TenantWhatsAppIntegration).where(
                TenantWhatsAppIntegration.tenant_id == tenant.id
            )
        ).first()

        if wa_integration:
            wa_status = wa_integration.status
            wa_display = wa_integration.display_phone_number
            wa_acc_name = wa_integration.business_name
            wa_app_id = wa_integration.meta_app_id
            wa_connected = wa_integration.setup_completed
    except Exception as wa_err:
        logger.warning(
            "metrics.whatsapp_lookup.failed",
            tenant_id=str(tenant.id),
            error=str(wa_err),
        )

    # 4. Assembly with Null-Safe Defaults (V2.2.0 Table)
    return TenantInfo(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        logo_url=tenant.logo_url,
        status=tenant.status,
        onboarding_step=tenant.onboarding_step or 1,
        business_whatsapp_number=tenant.business_whatsapp_number,
        clients_imported=has_customers,
        stock_imported=has_products,
        business_whatsapp_connected=wa_connected,
        ready=is_ready,
        whatsapp_status=wa_status,
        whatsapp_display_number=wa_display,
        whatsapp_account_name=wa_acc_name,
        whatsapp_app_id=wa_app_id,
        timezone=tenant.timezone,
        currency=tenant.currency,
        billing_status=tenant.billing_status or "inactive",
        plan_code=tenant.plan_code or "basic_monthly",
        trial_ends_at=tenant.trial_ends_at,
        subscription_ends_at=tenant.subscription_ends_at,
    )


@router.get("/me/", response_model=MeResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    active_membership: Optional[TenantUser] = Depends(get_active_membership),
    db: Session = Depends(get_session),
):
    """
    DETERMINISTIC BOOTSTRAP (V2.2.0): Single source of truth for identity and context.
    Strict enforcement of tenant precedence and null-safe resilience.
    """
    logger.info("users.get_me.start", user_id=str(current_user.id))

    # 1. Build Membership List (Null-Safe Iteration)
    # We query ALL memberships for this user
    memberships_db = db.exec(
        select(TenantUser, Tenant)
        .join(Tenant)
        .where(TenantUser.user_id == current_user.id, TenantUser.is_active.is_not(False))
        .order_by(
            TenantUser.is_default.desc(),
            TenantUser.created_at.asc(),
            TenantUser.tenant_id.asc(),
        )
    ).all()

    membership_infos = []
    for tu, t in memberships_db:
        try:
            membership_infos.append(
                MembershipInfo(
                    tenant=get_tenant_info_safe(db, t),
                    role=tu.tenant_role,
                    is_default=tu.is_default,
                )
            )
        except Exception as e:
            logger.error(
                "users.get_me.membership_error",
                user_id=str(current_user.id),
                tenant_id=str(t.id),
                error=str(e),
            )

    # 2. Resolve Active Tenant Info
    # If get_active_membership (deterministic resolver) returned a context, use it.
    active_tenant_info = None
    if active_membership:
        target_tenant = db.get(Tenant, active_membership.tenant_id)
        if target_tenant:
            active_tenant_info = get_tenant_info_safe(db, target_tenant)

    # 3. Assemble Response
    # Determinism check: Admin without header MUST have active_tenant=None
    if current_user.platform_role == "admin" and active_tenant_info:
        logger.debug(
            "users.get_me.admin_context_active", tenant_id=str(active_tenant_info.id)
        )
    elif current_user.platform_role == "admin":
        logger.info("users.get_me.admin_global_context")

    return MeResponse(
        user=current_user,
        active_tenant=active_tenant_info,
        memberships=membership_infos,
    )


@router.get(
    "", response_model=List[dict], dependencies=[Depends(require_roles(["owner"]))]
)
async def list_users(
    db: Session = Depends(get_session),
    active_tenant_id: UUID = Depends(get_active_tenant_id),
):
    """List all users for the tenant with their roles (owner only)."""
    users_db = db.exec(
        select(User, TenantUser.tenant_role, TenantUser.is_active)
        .join(TenantUser)
        .where(TenantUser.tenant_id == active_tenant_id)
    ).all()

    # Return mapping
    response = []
    for u, role, active in users_db:
        # 🛡️ Privacy Filter: Hide Platform Admins from regular tenant team views
        if u.platform_role == "admin":
            continue

        u_dict = u.model_dump()
        u_dict["role"] = role
        u_dict["is_active"] = active
        response.append(u_dict)
    return response


@router.patch("/me", response_model=User)
async def update_me(
    full_name: str,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Allows any authenticated user to update their own full name."""
    current_user.full_name = full_name
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

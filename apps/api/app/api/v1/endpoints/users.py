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
    get_db,
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
from app.core.billing import BillingResolver
from typing import List, Optional
from uuid import UUID

router = APIRouter()


def get_tenant_info_safe(db: Session, tenant: Tenant) -> TenantInfo:
    """
    DETERMINISTIC ONBOARDING (V4.7.0): Resolves tenant truth from real tables.
    Eliminates reliance on persisted flags (clients_imported, stock_imported, ready).
    """
    # 1. Dynamic Veracity (THE TRUTH)
    # 🛡️ Hardening: We ignore persisted flags and compute from real row counts.
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
    except Exception as e:
        logger.error(
            "users.tenant_info.count_failed",
            tenant_id=str(tenant.id),
            error=str(e),
        )
        # Fail-closed: In EntréGA, we prefer False over stale data if counts fail
        has_customers = False
        has_products = False

    # 2. Calculated Ready State
    # Rule: Tenant is ready ONLY if status is 'active' AND onboarding_state logic permits.
    # 🛡️ DEPLOY-SAFE: We ignore the legacy 'tenant.ready' DB field.
    is_ready = (tenant.status == "active") and (tenant.onboarding_state != "created")

    # 3. WhatsApp Status (Best-Effort)
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
    except Exception:
        pass

    # 4. Resolve Deterministic Billing (V2.5.0 Authority)
    billing_data = BillingResolver.resolve_billing(tenant)

    # 5. Assembly with Null-Safe Defaults (V2.3.0 Hardened Contract)
    return TenantInfo(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        logo_url=tenant.logo_url,
        status=tenant.status,
        onboarding_state=tenant.onboarding_state or "created",
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
        billing=billing_data,
    )


@router.get("/me/", response_model=MeResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    active_membership: Optional[TenantUser] = Depends(get_active_membership),
    db: Session = Depends(get_session),
):
    """
    DETERMINISTIC BOOTSTRAP (V2.2.0/V2.3.0): Single source of truth.
    Ensures that identity and active tenant context follow strict resolution.
    """
    logger.info("users.get_me.start", user_id=str(current_user.id))

    # 1. Build Membership List (V2.3.0 Strict Determinism)
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
    active_tenant_info = None
    if active_membership:
        target_tenant = db.get(Tenant, active_membership.tenant_id)
        if target_tenant:
            active_tenant_info = get_tenant_info_safe(db, target_tenant)

    # 3. Assemble Response
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
        if u.platform_role == "admin":
            continue

        u_dict = u.model_dump()
        u_dict["role"] = role
        u_dict["is_active"] = active
        response.append(u_dict)
    return response
class UserUpdate(BaseModel):
    full_name: str


@router.patch("/me/", response_model=User)
async def update_me(
    request: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allows any authenticated user to update their own full name."""
    current_user.full_name = request.full_name
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

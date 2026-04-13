from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from app.core.db import get_session
from app.core.dependencies import get_active_membership
from app.services.stripe_service import StripeService
from app.models.models import TenantUser, Tenant
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class CheckoutRequest(BaseModel):
    plan_code: str
    success_url: str
    cancel_url: str


@router.post("/checkout-session")
async def create_billing_checkout_session(
    request: CheckoutRequest,
    db: Session = Depends(get_session),
    membership: TenantUser = Depends(get_active_membership),
):
    """
    Creates a Stripe Checkout session for the active tenant.
    Enforces that only owners can initiate billing changes.
    """
    # 🛡️ HARDENING: Prevent operations on placeholder tenants (V3.4.2)
    ZERO_UUID = "00000000-0000-0000-0000-000000000000"
    if str(membership.tenant_id) == ZERO_UUID:
        from app.core.logging import logger
        logger.error("billing.checkout_blocked_placeholder_context", 
                     user_id=str(membership.user_id), 
                     tenant_id=str(membership.tenant_id))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contexto de negocio inválido. Por favor intenta re-ingresar al sistema.",
        )

    if membership.tenant_role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los dueños pueden gestionar la facturación.",
        )

    stripe_service = StripeService(db)
    try:
        session = stripe_service.create_checkout_session(
            tenant_id=str(membership.tenant_id),
            plan_code=request.plan_code,
            success_url=request.success_url,
            cancel_url=request.cancel_url,
        )
        return {"session_id": session.id, "url": session.url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error al crear sesión de pago")


@router.get("/status")
async def get_billing_status(
    db: Session = Depends(get_session),
    membership: TenantUser = Depends(get_active_membership),
):
    """
    Returns current billing status and plan for the active tenant.
    """
    tenant = db.get(Tenant, membership.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    return {
        "billing_status": tenant.billing_status,
        "plan_code": tenant.plan_code,
        "subscription_ends_at": tenant.subscription_ends_at,
        "is_premium": tenant.plan_code.startswith("premium")
        and tenant.billing_status == "active",
    }

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles, get_active_tenant_id
from app.models.models import User, Payment
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()


class PaymentCreate(BaseModel):
    customer_id: UUID
    amount: float
    method: str


@router.get(
    "/",
    response_model=List[Payment],
    dependencies=[Depends(require_roles(["owner", "operator"]))],
)
@router.get(
    "",
    response_model=List[Payment],
    dependencies=[Depends(require_roles(["owner", "operator"]))],
)
async def list_payments(
    db: Session = Depends(get_session),
    active_tenant_id: UUID = Depends(get_active_tenant_id),
):
    """List all payments for the tenant."""
    payments = db.exec(
        select(Payment)
        .where(Payment.tenant_id == active_tenant_id)
        .order_by(Payment.created_at.desc())
    ).all()
    return payments


@router.post("", dependencies=[Depends(require_roles(["owner", "operator"]))])
async def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id),
):
    """Register a new payment. Only updates customer balance. Stock is never touched."""
    from app.models.models import Customer, Tenant
    from app.services.inventory_service import execute_payment

    # Validate tenant and customer
    tenant = db.get(Tenant, active_tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    customer = db.get(Customer, payment.customer_id)
    if not customer or customer.tenant_id != active_tenant_id:
        raise HTTPException(status_code=404, detail="Customer not found in your tenant")

    try:
        new_payment = execute_payment(
            session=db,
            tenant=tenant,
            customer=customer,
            amount=payment.amount,
            method=payment.method,
            created_by_user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.commit()
    db.refresh(new_payment)
    return new_payment


@router.patch("/{id}", dependencies=[Depends(require_roles(["owner"]))])
async def update_payment(
    id: UUID,
    amount: Optional[float] = None,
    method: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id),
):
    """Update a payment's detail (owner only)."""
    payment = db.get(Payment, id)
    if not payment or payment.tenant_id != active_tenant_id:
        raise HTTPException(status_code=404, detail="Payment not found")

    if amount is not None:
        payment.amount = amount
    if method is not None:
        payment.method = method

    payment.updated_by_user_id = current_user.id
    payment.updated_at = datetime.now(timezone.utc)

    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


class ClearTotalRequest(BaseModel):
    customer_id: UUID
    method: str = "cash"


@router.post(
    "/clear-total", dependencies=[Depends(require_roles(["owner", "operator"]))]
)
async def clear_total_debt(
    request: ClearTotalRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id),
):
    """Liquidation of all debts for a customer. Stock is never touched."""
    from app.models.models import CustomerBalance, Tenant
    from app.services.inventory_service import execute_payment

    # 1. Get current balance
    balance_record = db.exec(
        select(CustomerBalance).where(
            CustomerBalance.customer_id == request.customer_id,
            CustomerBalance.tenant_id == active_tenant_id,
        )
    ).first()

    if not balance_record or balance_record.balance >= 0:
        return {
            "message": "No debt to clear",
            "balance": balance_record.balance if balance_record else 0,
        }

    debt_amount = abs(balance_record.balance)

    tenant = db.get(Tenant, active_tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    from app.models.models import Customer
    customer = db.get(Customer, request.customer_id)
    if not customer or customer.tenant_id != active_tenant_id:
        raise HTTPException(status_code=404, detail="Customer not found in your tenant")

    try:
        execute_payment(
            session=db,
            tenant=tenant,
            customer=customer,
            amount=debt_amount,
            method=request.method,
            created_by_user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    db.commit()
    return {"status": "success", "cleared_amount": debt_amount}

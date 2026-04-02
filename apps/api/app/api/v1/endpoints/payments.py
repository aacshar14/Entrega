from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles, get_active_tenant_id
from app.models.models import User, Payment
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=List[Payment], dependencies=[Depends(require_roles(["owner", "operator"]))])
async def list_payments(
    db: Session = Depends(get_session),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """List all payments for the tenant."""
    payments = db.exec(
        select(Payment).where(Payment.tenant_id == active_tenant_id)
    ).all()
    return payments

@router.post("/", dependencies=[Depends(require_roles(["owner", "operator"]))])
async def create_payment(
    customer_id: UUID,
    amount: float,
    method: str, # 'cash', 'transfer', 'card'
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """Register a new payment."""
    new_payment = Payment(
        tenant_id=active_tenant_id,
        customer_id=customer_id,
        amount=amount,
        method=method,
        created_by_user_id=current_user.id
    )
    db.add(new_payment)
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
    active_tenant_id: UUID = Depends(get_active_tenant_id)
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

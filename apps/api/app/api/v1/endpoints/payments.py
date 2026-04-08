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

@router.post("", dependencies=[Depends(require_roles(["owner", "operator"]))])
async def create_payment(
    customer_id: UUID,
    amount: float,
    method: str, # 'cash', 'transfer', 'card'
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """Register a new payment and settle debts/reconcile inventory."""
    from app.models.models import CustomerBalance, InventoryMovement, Customer
    
    # 1. Register Payment
    new_payment = Payment(
        tenant_id=active_tenant_id,
        customer_id=customer_id,
        amount=amount,
        method=method,
        created_by_user_id=current_user.id
    )
    db.add(new_payment)
    
    # 2. Update Customer Balance
    balance_record = db.exec(
        select(CustomerBalance).where(CustomerBalance.customer_id == customer_id)
    ).first()
    
    if balance_record:
        balance_record.balance += amount # Debt is negative, so adding reduces it
        balance_record.last_updated = datetime.now(timezone.utc)
        db.add(balance_record)
    else:
        new_balance = CustomerBalance(
            tenant_id=active_tenant_id,
            customer_id=customer_id,
            balance=amount,
            last_updated=datetime.now(timezone.utc)
        )
        db.add(new_balance)
        
    # 3. Automatic Reconciliation (Consignment -> Sale)
    # Convert 'delivery' movements to 'sale_reported' as they get paid
    # Simple strategy: Mark recent deliveries as paid up to the amount
    # For now, we'll just record a reconciliation movement
    recon_movement = InventoryMovement(
        tenant_id=active_tenant_id,
        product_id=None, # Overall payment
        customer_id=customer_id,
        quantity=0, # Financial only
        type='payment_received',
        description=f"Pago recibido via {method}: ${amount:.2f}",
        unit_price=0,
        total_amount=amount,
        created_by_user_id=current_user.id
    )
    # We allow product_id to be NULL for pure financial movements if the model supports it
    # Currently it doesn't (foreign key). So we skip creating InventoryMovement for pure cash if not linked to SKU.
    
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

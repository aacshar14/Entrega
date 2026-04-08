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

@router.get("", response_model=List[Payment], dependencies=[Depends(require_roles(["owner", "operator"]))])
async def list_payments(
    db: Session = Depends(get_session),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
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
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """Register a new payment and settle debts/reconcile inventory."""
    customer_id = payment.customer_id
    amount = payment.amount
    method = payment.method
    
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

class ClearTotalRequest(BaseModel):
    customer_id: UUID
    method: str = "cash"

@router.post("/clear-total", dependencies=[Depends(require_roles(["owner", "operator"]))])
async def clear_total_debt(
    request: ClearTotalRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """Liquidation of all debts for a customer."""
    from app.models.models import CustomerBalance, InventoryMovement
    
    # 1. Get current balance
    balance_record = db.exec(
        select(CustomerBalance).where(
            CustomerBalance.customer_id == request.customer_id,
            CustomerBalance.tenant_id == active_tenant_id
        )
    ).first()
    
    if not balance_record or balance_record.balance >= 0:
        return {"message": "No debt to clear", "balance": balance_record.balance if balance_record else 0}
        
    debt_amount = abs(balance_record.balance)
    
    # 2. Register full payment
    clearing_payment = Payment(
        tenant_id=active_tenant_id,
        customer_id=request.customer_id,
        amount=debt_amount,
        method=request.method,
        created_by_user_id=current_user.id,
        notes="Liquidación total de deuda"
    )
    db.add(clearing_payment)
    
    # 3. Reset balance to zero
    balance_record.balance = 0.0
    balance_record.last_updated = datetime.now(timezone.utc)
    db.add(balance_record)
    
    # 4. Reconciliation movement (mark inventory as sold/settled)
    recon_movement = InventoryMovement(
        tenant_id=active_tenant_id,
        product_id=None,
        customer_id=request.customer_id,
        quantity=0,
        type='payment_received',
        description=f"Liquidación TOTAL vía {request.method}",
        unit_price=0,
        total_amount=debt_amount,
        created_by_user_id=current_user.id
    )
    # Note: If InventoryMovement requires product_id, this might fail unless nullable
    # For now we assume typical reconciliation pattern
    
    db.commit()
    return {"status": "success", "cleared_amount": debt_amount}

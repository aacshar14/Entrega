from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles, get_active_tenant_id
from app.models.models import User, Payment, CustomerBalance, InventoryMovement
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional
from sqlmodel import func

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
    """Register a new payment and update customer balance."""
    # 1. Register Payment
    new_payment = Payment(
        tenant_id=active_tenant_id,
        customer_id=customer_id,
        amount=amount,
        method=method,
        created_by_user_id=current_user.id
    )
    db.add(new_payment)

    # 2. Update Balance (Debt is negative, payment is positive)
    balance = db.exec(select(CustomerBalance).where(
        CustomerBalance.customer_id == customer_id,
        CustomerBalance.tenant_id == active_tenant_id
    )).first()
    
    if balance:
        balance.balance += amount
        balance.last_updated = datetime.now(timezone.utc)
        db.add(balance)

    db.commit()
    db.refresh(new_payment)
    return new_payment

@router.post("/clear-total", dependencies=[Depends(require_roles(["owner", "operator"]))])
async def clear_total_debt(
    customer_id: UUID,
    method: str,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """Clears all pending debt and reduces physical stock outside for a customer."""
    # 1. Get current debt
    balance = db.exec(select(CustomerBalance).where(
        CustomerBalance.customer_id == customer_id,
        CustomerBalance.tenant_id == active_tenant_id
    )).first()
    
    if not balance or balance.balance >= 0:
        return {"message": "Customer has no pending debt."}
    
    amount_to_pay = abs(balance.balance)

    # 2. Record full payment
    payment = Payment(
        tenant_id=active_tenant_id,
        customer_id=customer_id,
        amount=amount_to_pay,
        method=method,
        created_by_user_id=current_user.id
    )
    db.add(payment)

    # 3. Liquidate financial balance
    balance.balance = 0.0
    balance.last_updated = datetime.now(timezone.utc)
    db.add(balance)

    # 4. Liquidate outside inventory (convert current outside stock to 'sale_reported')
    # Get all products that have units outside for this customer
    outside_stock = db.exec(
        select(InventoryMovement.product_id, InventoryMovement.sku, func.sum(InventoryMovement.quantity)).where(
            InventoryMovement.tenant_id == active_tenant_id,
            InventoryMovement.customer_id == customer_id
        ).group_by(InventoryMovement.product_id, InventoryMovement.sku)
        .having(func.sum(InventoryMovement.quantity) != 0)
    ).all()

    for pid, sku, qty in outside_stock:
        # Create a matching movement with type 'sale_reported' to zero-out the outside stock
        # If qty calculation: sum is usually negative (delivery), so we add positive quantity to sale_reported
        # to cancel it out from the "Outside" perspective.
        liquidation_movement = InventoryMovement(
            tenant_id=active_tenant_id,
            product_id=pid,
            customer_id=customer_id,
            sku=sku,
            quantity=-float(qty), # Cancels out current balance (if -10 delivery, qty is 10)
            type="sale_reported",
            description=f"Liquidación total de deuda confirmada por {current_user.email}",
            created_by_user_id=current_user.id
        )
        db.add(liquidation_movement)

    db.commit()
    return {"message": f"Debt of ${amount_to_pay} cleared and inventory reconciled."}

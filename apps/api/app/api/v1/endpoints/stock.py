from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles
from app.models.models import User, StockBalance, InventoryMovement
from uuid import UUID
from datetime import datetime, timezone

router = APIRouter()

@router.get("/", dependencies=[Depends(require_roles(["owner", "operator"]))])
async def list_stock(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List current stock levels."""
    stock = db.exec(
        select(StockBalance).where(StockBalance.tenant_id == current_user.tenant_id)
    ).all()
    return stock

@router.post("/adjustments", dependencies=[Depends(require_roles(["owner"]))])
async def adjust_stock(
    product_id: UUID, 
    quantity: float, 
    description: str = "Adjustment",
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Manually adjust stock (owner only).
    """
    # Create movement
    new_movement = InventoryMovement(
        tenant_id=current_user.tenant_id,
        product_id=product_id,
        quantity=quantity,
        type="adjustment",
        description=description,
        created_by_user_id=current_user.id
    )
    db.add(new_movement)
    
    # Update balance
    balance = db.exec(
        select(StockBalance).where(
            StockBalance.tenant_id == current_user.tenant_id,
            StockBalance.product_id == product_id
        )
    ).first()
    
    if balance:
        balance.quantity += quantity
        balance.updated_by_user_id = current_user.id
        balance.last_updated = datetime.now(timezone.utc)
        db.add(balance)
    else:
        new_balance = StockBalance(
            tenant_id=current_user.tenant_id,
            product_id=product_id,
            quantity=quantity,
            updated_by_user_id=current_user.id
        )
        db.add(new_balance)
        
    db.commit()
    return {"status": "Stock adjusted successfully"}

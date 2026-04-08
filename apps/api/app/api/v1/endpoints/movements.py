from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles, get_active_tenant_id
from app.models.models import User, InventoryMovement
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=List[InventoryMovement], dependencies=[Depends(require_roles(["owner", "operator"]))])
async def list_movements(
    db: Session = Depends(get_session),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """List all inventory movements for the tenant."""
    movements = db.exec(
        select(InventoryMovement).where(InventoryMovement.tenant_id == active_tenant_id)
    ).all()
    return movements

@router.post("/manual", dependencies=[Depends(require_roles(["owner", "operator"]))])
async def create_manual_movement(
    product_id: UUID,
    quantity: float,
    type: str, # 'restock', 'return', 'delivery', 'adjustment'
    customer_id: Optional[UUID] = None,
    description: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """Create a manual inventory movement with automated tier-pricing for deliveries."""
    from app.models.models import Customer, Product
    
    # 1. Fetch Product for SKU and basic info
    product = db.get(Product, product_id)
    if not product or product.tenant_id != active_tenant_id:
        raise HTTPException(status_code=404, detail="Product not found")
        
    unit_price = 0.0
    tier_applied = None
    
    # 2. If delivery, resolve tier and price
    if type == "delivery" and customer_id:
        customer = db.get(Customer, customer_id)
        if not customer or customer.tenant_id != active_tenant_id:
            raise HTTPException(status_code=404, detail="Customer not found")
            
        tier = customer.tier or "menudeo"
        tier_applied = tier
        
        # Resolve price based on tier
        if tier == "mayoreo":
            unit_price = product.price_mayoreo
        elif tier == "especial":
            unit_price = product.price_especial
        else: # menudeo or default
            unit_price = product.price_menudeo or product.price
            
    # 3. Create movement
    new_movement = InventoryMovement(
        tenant_id=active_tenant_id,
        product_id=product_id,
        customer_id=customer_id,
        customer_name_snapshot=customer.name if customer_id else None,
        quantity=quantity,
        type=type,
        description=description,
        sku=product.sku,
        tier_applied=tier_applied,
        unit_price=unit_price,
        total_amount=abs(quantity) * unit_price,
        created_by_user_id=current_user.id
    )
    
    db.add(new_movement)
    db.commit()
    db.refresh(new_movement)
    return new_movement

@router.patch("/{id}", dependencies=[Depends(require_roles(["owner"]))])
async def update_movement(
    id: UUID,
    description: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """Update a movement's metadata (owner only)."""
    movement = db.get(InventoryMovement, id)
    if not movement or movement.tenant_id != active_tenant_id:
        raise HTTPException(status_code=404, detail="Movement not found")
    
    if description is not None:
        movement.description = description
    
    movement.updated_by_user_id = current_user.id
    movement.updated_at = datetime.now(timezone.utc)
    
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement

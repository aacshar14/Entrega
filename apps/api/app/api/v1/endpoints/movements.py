from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles, get_active_tenant_id
from app.models.models import User, InventoryMovement
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel

class MovementManualCreate(BaseModel):
    product_id: UUID
    quantity: float
    type: str
    customer_id: Optional[UUID] = None
    description: Optional[str] = None

router = APIRouter()

@router.get("", response_model=List[InventoryMovement], dependencies=[Depends(require_roles(["owner", "operator"]))])
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
    movement: MovementManualCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """Create a manual inventory movement with automated tier-pricing for deliveries."""
    product_id = movement.product_id
    quantity = movement.quantity
    type = movement.type
    customer_id = movement.customer_id
    description = movement.description
    
    from app.models.models import Customer, Product
    
    # 1. Fetch Product for SKU and basic info
    product = db.get(Product, product_id)
    if not product or product.tenant_id != active_tenant_id:
        raise HTTPException(status_code=404, detail="Product not found")
        
    unit_price = 0.0
    tier_applied = None
    
    # 2. If customer-facing movement, enforce customer_id and get snapshot
    customer_name_snapshot = None
    if type in ["delivery", "return", "sale_reported", "delivery_to_customer", "return_from_customer"]:
        if not customer_id:
            raise HTTPException(status_code=400, detail=f"Customer ID is required for movement type: {type}")
        
        customer = db.get(Customer, customer_id)
        if not customer or customer.tenant_id != active_tenant_id:
            raise HTTPException(status_code=404, detail="Customer not found")
        customer_name_snapshot = customer.name

        # Resolve price tier if it's a delivery
        if type in ["delivery", "delivery_to_customer"]:
            if customer.tier == "mayoreo":
                unit_price = product.price_mayoreo
                tier_applied = "mayoreo"
            elif customer.tier == "especial":
                unit_price = product.price_especial
                tier_applied = "especial"
            else:
                unit_price = product.price_menudeo
                tier_applied = "menudeo"
    
    # 3. Create Movement
    new_movement = InventoryMovement(
        tenant_id=active_tenant_id,
        product_id=product.id,
        customer_id=customer_id,
        customer_name_snapshot=customer_name_snapshot,
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
    
    # 4. Synchronize with StockBalance (Warehouse Stock)
    # sale_reported only affects 'outside' stock and money, not physical warehouse inventory
    if type != "sale_reported":
        from app.models.models import StockBalance
        balance = db.exec(select(StockBalance).where(StockBalance.product_id == product.id)).first()
        if balance:
            balance.quantity += quantity
            balance.updated_by_user_id = current_user.id
            balance.last_updated = datetime.now(timezone.utc)
        else:
            balance = StockBalance(
                tenant_id=active_tenant_id,
                product_id=product.id,
                quantity=quantity,
                updated_by_user_id=current_user.id
            )
        db.add(balance)

    db.commit()
    db.refresh(new_movement)
    return new_movement

@router.get("/customer-inventory", dependencies=[Depends(require_roles(["owner", "operator"]))])
async def get_customer_inventory(
    db: Session = Depends(get_session),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """
    Returns current inventory 'outside' (at customer locations).
    Derived from summing: delivery (+), sale_reported (-), return (-).
    Note: In our DB, delivery is stored as negative quantity (HQ decrease).
    To show positive 'outside' qty, we flip the sum.
    """
    from sqlalchemy import func
    from app.models.models import Product
    
    # Aggregate by customer and SKU
    # We filter by movements that affect 'outside' stock
    # delivery/delivery_to_customer (decreases HQ, increases outside)
    # return/return_from_customer (increases HQ, decreases outside)
    # sale_reported (decreases outside, affects finance)
    
    outside_types = ["delivery", "delivery_to_customer", "return", "return_from_customer", "sale_reported"]
    
    # We use a subquery or direct aggregation
    # For speed, we'll iterate or use a group_by
    # SQLModel/SQLAlchemy approach:
    query = (
        select(
            InventoryMovement.customer_id,
            InventoryMovement.customer_name_snapshot,
            InventoryMovement.sku,
            func.sum(InventoryMovement.quantity).label("total_qty"),
            func.max(InventoryMovement.created_at).label("last_movement")
        )
        .where(InventoryMovement.tenant_id == active_tenant_id)
        .where(InventoryMovement.customer_id != None)
        .where(InventoryMovement.type.in_(outside_types))
        .group_by(InventoryMovement.customer_id, InventoryMovement.customer_name_snapshot, InventoryMovement.sku)
    )
    
    results = db.exec(query).all()
    
    inventory_list = []
    for cust_id, cust_name, sku, total_signed_qty, last_at in results:
        # Since delivery is negative in DB, total_signed_qty will be negative if stock is outside
        # We flip it to show positive 'outside' quantity
        qty_outside = -total_signed_qty
        
        if qty_outside == 0:
            continue # Don't show settled inventory
            
        # Fallback for old records where snapshot was NULL
        final_cust_name = cust_name
        if not final_cust_name:
            from app.models.models import Customer
            final_cust_name = db.exec(select(Customer.name).where(Customer.id == cust_id)).first() or "Desconocido"
            
        # Get product name for friendly display
        p_name = db.exec(select(Product.name).where(Product.sku == sku, Product.tenant_id == active_tenant_id)).first() or sku
        
        inventory_list.append({
            "customer_id": str(cust_id),
            "customer_name": final_cust_name,
            "sku": sku,
            "product_name": p_name,
            "quantity_outside": qty_outside,
            "last_movement_at": last_at.isoformat() if last_at else None
        })
        
    return inventory_list

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

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles
from app.models.models import User, InventoryMovement
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=List[InventoryMovement], dependencies=[Depends(require_roles(["owner", "operator"]))])
async def list_movements(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List all inventory movements for the tenant."""
    movements = db.exec(
        select(InventoryMovement).where(InventoryMovement.tenant_id == current_user.tenant_id)
    ).all()
    return movements

@router.post("/manual", dependencies=[Depends(require_roles(["owner", "operator"]))])
async def create_manual_movement(
    product_id: UUID,
    quantity: float,
    type: str, # 'restock', 'return', etc.
    customer_id: Optional[UUID] = None,
    description: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a manual inventory movement."""
    new_movement = InventoryMovement(
        tenant_id=current_user.tenant_id,
        product_id=product_id,
        customer_id=customer_id,
        quantity=quantity,
        type=type,
        description=description,
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
    current_user: User = Depends(get_current_user)
):
    """Update a movement's metadata (owner only)."""
    movement = db.get(InventoryMovement, id)
    if not movement or movement.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Movement not found")
    
    if description is not None:
        movement.description = description
    
    movement.updated_by_user_id = current_user.id
    movement.updated_at = datetime.now(timezone.utc)
    
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement

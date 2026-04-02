from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles
from app.models.models import User, Product
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=List[Product], dependencies=[Depends(require_roles(["owner", "operator"]))])
async def list_products(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List all products (owner, operator)."""
    products = db.exec(
        select(Product).where(Product.tenant_id == current_user.tenant_id)
    ).all()
    return products

@router.post("/", response_model=Product, dependencies=[Depends(require_roles(["owner"]))])
async def create_product(
    name: str,
    price: float,
    sku: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new product (owner only)."""
    new_product = Product(
        tenant_id=current_user.tenant_id,
        name=name,
        price=price,
        sku=sku,
        created_by_user_id=current_user.id
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@router.patch("/{id}", response_model=Product, dependencies=[Depends(require_roles(["owner"]))])
async def update_product(
    id: UUID,
    name: Optional[str] = None,
    price: Optional[float] = None,
    sku: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Update a product (owner only)."""
    product = db.get(Product, id)
    if not product or product.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if name is not None:
        product.name = name
    if price is not None:
        product.price = price
    if sku is not None:
        product.sku = sku
        
    product.updated_by_user_id = current_user.id
    product.updated_at = datetime.now(timezone.utc)
    
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

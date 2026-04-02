from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles
from app.models.models import User, Product, StockBalance, InventoryMovement
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional
import csv
import io

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

@router.get("/stock", dependencies=[Depends(require_roles(["owner", "operator"]))])
async def list_products_stock(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List products with current stock levels."""
    # Query products joined with their stock balances
    statement = select(Product, StockBalance.quantity).join(
        StockBalance, Product.id == StockBalance.product_id, isouter=True
    ).where(Product.tenant_id == current_user.tenant_id)
    
    results = db.exec(statement).all()
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "price": p.price,
            "quantity": q if q is not None else 0.0
        }
        for p, q in results
    ]

@router.post("/bulk-import", dependencies=[Depends(require_roles(["owner"]))])
async def bulk_import_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Bulk import products and initial stock from CSV.
    Headers: name,sku,price,initial_stock,category
    """
    content = await file.read()
    string_io = io.StringIO(content.decode('utf-8'))
    reader = csv.DictReader(string_io)
    
    tenant_id = current_user.tenant_id
    created_count = 0
    updated_count = 0
    
    for row in reader:
        name = row.get("name", "").strip()
        sku = row.get("sku", "").strip()
        price_str = row.get("price", "0").strip()
        initial_stock_str = row.get("initial_stock", "0").strip()
        
        if not name:
            continue
            
        try:
            price = float(price_str)
            initial_stock = float(initial_stock_str)
        except ValueError:
            price = 0.0
            initial_stock = 0.0
            
        # Check if product exists by SKU (if provided) or Name
        product = None
        if sku:
            product = db.exec(select(Product).where(Product.tenant_id == tenant_id, Product.sku == sku)).first()
        
        if not product:
            product = db.exec(select(Product).where(Product.tenant_id == tenant_id, Product.name == name)).first()
            
        if product:
            product.price = price
            product.sku = sku
            product.updated_by_user_id = current_user.id
            product.updated_at = datetime.now(timezone.utc)
            db.add(product)
            updated_count += 1
        else:
            product = Product(
                tenant_id=tenant_id,
                name=name,
                sku=sku,
                price=price,
                created_by_user_id=current_user.id
            )
            db.add(product)
            db.flush() # Get product ID
            created_count += 1
            
        # Handle stock
        if initial_stock != 0:
            balance = db.exec(select(StockBalance).where(StockBalance.product_id == product.id)).first()
            if balance:
                # If product existed, we could choose to add or overwrite. 
                # For bulk import of "initial stock", we usually set it.
                balance.quantity = initial_stock
                balance.updated_by_user_id = current_user.id
                balance.last_updated = datetime.now(timezone.utc)
                db.add(balance)
            else:
                balance = StockBalance(
                    tenant_id=tenant_id,
                    product_id=product.id,
                    quantity=initial_stock,
                    updated_by_user_id=current_user.id
                )
                db.add(balance)
            
            # Record movement
            movement = InventoryMovement(
                tenant_id=tenant_id,
                product_id=product.id,
                quantity=initial_stock,
                type="adjustment",
                description="Importación Masiva Inicial",
                created_by_user_id=current_user.id
            )
            db.add(movement)
            
    db.commit()
    return {"created": created_count, "updated": updated_count}

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

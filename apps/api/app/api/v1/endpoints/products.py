from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select, func
from app.core.db import get_session
from app.core.dependencies import get_current_user, get_active_tenant
from app.models.models import User, Tenant, Product, StockBalance, InventoryMovement
from uuid import UUID
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
import csv
import io

router = APIRouter()

class ProductImportRow(BaseModel):
    sku: Optional[str] = None
    name: str
    quantity: float = 0.0
    price: float = 0.0

class ProductImportPreviewRow(BaseModel):
    row_index: int
    data: ProductImportRow
    is_valid: bool
    errors: List[str] = []
    is_duplicate: bool = False

class ProductImportPreviewResponse(BaseModel):
    total_rows: int
    valid_rows_count: int
    invalid_rows_count: int
    duplicate_rows_count: int
    rows: List[ProductImportPreviewRow]

class ProductImportCommitRequest(BaseModel):
    rows: List[ProductImportRow]

@router.get("/", response_model=List[Product])
async def list_products(
    db: Session = Depends(get_session),
    active_tenant: Tenant = Depends(get_active_tenant)
):
    """List all products for the active tenant."""
    products = db.exec(
        select(Product).where(Product.tenant_id == active_tenant.id)
    ).all()
    return products

@router.get("/stock")
async def list_products_stock(
    db: Session = Depends(get_session),
    active_tenant: Tenant = Depends(get_active_tenant)
):
    """List products with current stock levels."""
    statement = select(Product, StockBalance.quantity).join(
        StockBalance, Product.id == StockBalance.product_id, isouter=True
    ).where(Product.tenant_id == active_tenant.id)
    
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

@router.post("/import/preview", response_model=ProductImportPreviewResponse)
async def import_products_preview(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    active_tenant: Tenant = Depends(get_active_tenant)
):
    """Step 1: Preview CSV data for product/stock import."""
    content = await file.read()
    string_io = io.StringIO(content.decode('utf-8'))
    reader = csv.DictReader(string_io)
    
    existing_products = db.exec(
        select(Product).where(Product.tenant_id == active_tenant.id)
    ).all()
    existing_skus = {p.sku.lower() for p in existing_products if p.sku}
    existing_names = {p.name.lower() for p in existing_products}
    
    rows_preview = []
    total = 0
    valid_count = 0
    invalid_count = 0
    duplicate_count = 0
    
    for i, row in enumerate(reader, 1):
        total += 1
        errors = []
        name = row.get("name", "").strip()
        sku = row.get("sku", "").strip()
        quantity_str = row.get("quantity", "0").strip()
        price_str = row.get("price", "0").strip()
        
        if not name:
            errors.append("Product name is required")
            
        try:
            qty = float(quantity_str)
        except ValueError:
            errors.append("Quantity must be numeric")
            qty = 0
            
        try:
            prc = float(price_str)
        except ValueError:
            errors.append("Price must be numeric")
            prc = 0
            
        is_duplicate = False
        if name.lower() in existing_names or (sku and sku.lower() in existing_skus):
            is_duplicate = True
            duplicate_count += 1
            
        is_valid = len(errors) == 0
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1
            
        rows_preview.append(ProductImportPreviewRow(
            row_index=i,
            data=ProductImportRow(
                sku=sku,
                name=name,
                quantity=qty,
                price=prc
            ),
            is_valid=is_valid,
            errors=errors,
            is_duplicate=is_duplicate
        ))
        
    return ProductImportPreviewResponse(
        total_rows=total,
        valid_rows_count=valid_count,
        invalid_rows_count=invalid_count,
        duplicate_rows_count=duplicate_count,
        rows=rows_preview
    )

@router.post("/import/commit")
async def import_products_commit(
    request: ProductImportCommitRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant: Tenant = Depends(get_active_tenant)
):
    """Step 2: Commit valid product rows to the database."""
    tenant_id = active_tenant.id
    created_count = 0
    updated_count = 0
    
    for row in request.rows:
        # Simple upsert logic for products
        product = db.exec(
            select(Product).where(Product.tenant_id == tenant_id, Product.name == row.name)
        ).first()
        
        if not product and row.sku:
             product = db.exec(
                select(Product).where(Product.tenant_id == tenant_id, Product.sku == row.sku)
            ).first()
             
        if product:
            product.price = row.price
            if row.sku: product.sku = row.sku
            product.updated_by_user_id = current_user.id
            product.updated_at = datetime.now(timezone.utc)
            db.add(product)
            updated_count += 1
        else:
            product = Product(
                tenant_id=tenant_id,
                name=row.name,
                sku=row.sku,
                price=row.price,
                created_by_user_id=current_user.id
            )
            db.add(product)
            db.flush()
            created_count += 1
            
        # Add stock
        if row.quantity != 0:
            balance = db.exec(select(StockBalance).where(StockBalance.product_id == product.id)).first()
            if balance:
                balance.quantity += row.quantity
                balance.updated_by_user_id = current_user.id
                balance.last_updated = datetime.now(timezone.utc)
            else:
                balance = StockBalance(
                    tenant_id=tenant_id,
                    product_id=product.id,
                    quantity=row.quantity,
                    updated_by_user_id=current_user.id
                )
            db.add(balance)
            
            movement = InventoryMovement(
                tenant_id=tenant_id,
                product_id=product.id,
                quantity=row.quantity,
                type="adjustment",
                description="Importación Masiva Academy",
                created_by_user_id=current_user.id
            )
            db.add(movement)
            
    db.commit()
    return {"status": "success", "created": created_count, "updated": updated_count}

@router.post("/", response_model=Product)
async def create_product(
    name: str,
    price: float,
    sku: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant: Tenant = Depends(get_active_tenant)
):
    """Create a new product for the active tenant."""
    new_product = Product(
        tenant_id=active_tenant.id,
        name=name,
        price=price,
        sku=sku,
        created_by_user_id=current_user.id
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@router.patch("/{id}", response_model=Product)
async def update_product(
    id: UUID,
    name: Optional[str] = None,
    price: Optional[float] = None,
    sku: Optional[str] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant: Tenant = Depends(get_active_tenant)
):
    """Update a product for the active tenant."""
    product = db.get(Product, id)
    if not product or product.tenant_id != active_tenant.id:
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

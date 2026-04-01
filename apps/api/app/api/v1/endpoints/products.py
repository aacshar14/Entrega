import csv
import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_tenant_id
from app.models.models import Product, StockBalance
from uuid import UUID

router = APIRouter()

@router.get("/")
async def list_products(
    db: Session = Depends(get_session),
    tenant_id: UUID = Depends(get_tenant_id)
):
    products = db.exec(select(Product).where(Product.tenant_id == tenant_id)).all()
    return products

@router.post("/")
async def create_product(
    product: Product, 
    db: Session = Depends(get_session),
    tenant_id: UUID = Depends(get_tenant_id)
):
    product.tenant_id = tenant_id # Enforce from header
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.post("/bulk-import")
async def bulk_import_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    tenant_id: UUID = Depends(get_tenant_id)
):
    """
    Import products and initial stock from a CSV file.
    Expected headers: name, sku, price, initial_stock
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    content = await file.read()
    stream = io.StringIO(content.decode('utf-8'))
    reader = csv.DictReader(stream)
    
    products_created = 0
    for row in reader:
        try:
            # 1. Create Product
            new_product = Product(
                tenant_id=tenant_id, # Always use from header for security
                name=row['name'],
                sku=row.get('sku'),
                price=float(row['price'])
            )
            db.add(new_product)
            db.commit()
            db.refresh(new_product)
            
            # 2. Set Initial Stock
            initial_stock = float(row.get('initial_stock', 0))
            new_stock = StockBalance(
                tenant_id=tenant_id,
                product_id=new_product.id,
                quantity=initial_stock
            )
            db.add(new_stock)
            db.commit()
            products_created += 1
        except Exception as e:
            db.rollback()
            print(f"Error importing row {row}: {e}")
            continue
            
    return {"message": f"Successfully imported {products_created} products"}

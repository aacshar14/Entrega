from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.core.db import get_session
from app.core.dependencies import get_tenant_id
from app.models.models import StockBalance, InventoryMovement
from uuid import UUID

router = APIRouter()

@router.get("/")
async def list_stock(
    db: Session = Depends(get_session),
    tenant_id: UUID = Depends(get_tenant_id)
):
    stock = db.exec(select(StockBalance).where(StockBalance.tenant_id == tenant_id)).all()
    return stock

@router.get("/movements")
async def list_movements(
    db: Session = Depends(get_session),
    tenant_id: UUID = Depends(get_tenant_id)
):
    movements = db.exec(select(InventoryMovement).where(InventoryMovement.tenant_id == tenant_id)).all()
    return movements

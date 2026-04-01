from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.models import StockBalance, InventoryMovement

router = APIRouter()

@router.get("/")
async def list_stock(db: Session = Depends(get_session)):
    stock = db.exec(select(StockBalance)).all()
    return stock

@router.get("/movements")
async def list_movements(db: Session = Depends(get_session)):
    movements = db.exec(select(InventoryMovement)).all()
    return movements

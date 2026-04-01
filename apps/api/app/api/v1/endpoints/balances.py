from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.models import CustomerBalance

router = APIRouter()

@router.get("/")
async def list_balances(db: Session = Depends(get_session)):
    balances = db.exec(select(CustomerBalance)).all()
    return balances

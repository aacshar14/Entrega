from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.models import Payment

router = APIRouter()

@router.get("/")
async def list_payments(db: Session = Depends(get_session)):
    payments = db.exec(select(Payment)).all()
    return payments

@router.post("/")
async def create_payment(payment: Payment, db: Session = Depends(get_session)):
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment

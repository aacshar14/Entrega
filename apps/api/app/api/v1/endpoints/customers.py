from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.core.db import get_session
from app.models.models import Customer

router = APIRouter()

@router.get("/")
async def list_customers(db: Session = Depends(get_session)):
    customers = db.exec(select(Customer)).all()
    return customers

@router.post("/")
async def create_customer(customer: Customer, db: Session = Depends(get_session)):
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

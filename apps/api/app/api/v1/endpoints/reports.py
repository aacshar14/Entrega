from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles, get_active_tenant_id
from app.models.models import User, InventoryMovement, Payment, Customer
from uuid import UUID
from datetime import datetime, timedelta, timezone

router = APIRouter()

@router.get("/weekly", dependencies=[Depends(require_roles(["owner"]))])
async def get_weekly_report(
    db: Session = Depends(get_session),
    active_tenant_id: UUID = Depends(get_active_tenant_id)
):
    """Generates simple weekly summary for pilot user (owner only)."""
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    # 1. Deliveries count
    deliveries = db.exec(
        select(func.count(InventoryMovement.id)).where(
            (InventoryMovement.tenant_id == active_tenant_id) &
            (InventoryMovement.type == "delivery") &
            (InventoryMovement.created_at >= seven_days_ago)
        )
    ).one() or 0
    
    # 2. Payments total amount
    payments = db.exec(
        select(func.sum(Payment.amount)).where(
            (Payment.tenant_id == active_tenant_id) &
            (Payment.created_at >= seven_days_ago)
        )
    ).one() or 0.0
    
    # 3. New customers count
    new_customers = db.exec(
        select(func.count(Customer.id)).where(
            (Customer.tenant_id == active_tenant_id) &
            (Customer.created_at >= seven_days_ago)
        )
    ).one() or 0
    
    return {
        "deliveries": int(deliveries),
        "payments": float(payments),
        "new_customers": int(new_customers),
        "period": "Last 7 Days",
        "status": "ready"
    }

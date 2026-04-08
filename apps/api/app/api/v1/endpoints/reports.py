from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles, get_active_tenant_id
from app.models.models import User, InventoryMovement, Payment, Customer, Product, CustomerBalance
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
    
    # 4. Top Products (by quantity delivered/sold)
    top_products_query = (
        select(Product.name, func.sum(func.abs(InventoryMovement.quantity)).label("total_qty"))
        .join(InventoryMovement, Product.id == InventoryMovement.product_id)
        .where(
            (InventoryMovement.tenant_id == active_tenant_id) &
            (InventoryMovement.type.in_(["delivery", "sale_reported"])) &
            (InventoryMovement.created_at >= seven_days_ago)
        )
        .group_by(Product.name)
        .order_by(desc("total_qty"))
        .limit(3)
    )
    from sqlmodel import desc
    top_products_results = db.exec(top_products_query).all()
    
    # 5. Top Debtors (Highest absolute balance)
    top_debtors_query = (
        select(Customer.name, CustomerBalance.balance)
        .join(CustomerBalance, Customer.id == CustomerBalance.customer_id)
        .where(
            (Customer.tenant_id == active_tenant_id) &
            (CustomerBalance.balance < 0)
        )
        .order_by(CustomerBalance.balance) # Lowest first
        .limit(3)
    )
    top_debtors_results = db.exec(top_debtors_query).all()

    return {
        "deliveries": int(deliveries),
        "payments": float(payments),
        "new_customers": int(new_customers),
        "top_products": [{"name": r[0], "quantity": float(r[1])} for r in top_products_results],
        "top_debtors": [{"name": r[0], "balance": abs(float(r[1]))} for r in top_debtors_results],
        "period": "Últimos 7 días",
        "status": "ready"
    }

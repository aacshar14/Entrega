from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from app.core.db import get_session
from app.core.dependencies import get_current_user, require_roles
from app.models.models import User, Customer, Product, InventoryMovement, Payment
from uuid import UUID

router = APIRouter()

@router.get("/", dependencies=[Depends(require_roles(["owner", "operator"]))])
async def get_dashboard_summary(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Returns a brief summary for the dashboard.
    Authorized roles: owner, operator
    """
    tenant_id = current_user.tenant_id
    
    # Example summary data:
    customer_count = db.exec(select(func.count(Customer.id)).where(Customer.tenant_id == tenant_id)).one()
    product_count = db.exec(select(func.count(Product.id)).where(Product.tenant_id == tenant_id)).one()
    total_payments = db.exec(select(func.sum(Payment.amount)).where(Payment.tenant_id == tenant_id)).one() or 0.0
    
    return {
        "customer_count": customer_count,
        "product_count": product_count,
        "total_payments": total_payments,
        "message": f"Welcome back to EntréGA, {current_user.full_name}!"
    }

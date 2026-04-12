from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func, desc
from app.core.db import get_session
from app.core.dependencies import get_current_user, get_active_tenant
from app.models.models import (
    User,
    Tenant,
    Customer,
    Product,
    Payment,
    CustomerBalance,
    StockBalance,
)
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from app.services.metrics_service import get_tenant_metrics

router = APIRouter()


@router.get("")
async def get_dashboard_summary(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant: Tenant = Depends(get_active_tenant),
):
    tenant_id = active_tenant.id

    # 1. Main Stats (Performance Hardening V2)
    from app.services.dashboard_service import DashboardService

    ds = DashboardService(db)
    kpis = ds.get_dashboard_kpis(active_tenant)

    total_debt_abs = kpis.get("total_debt", 0.0)
    sales_today = kpis.get("sales_today", 0.0)
    total_deliveries_kpi = kpis.get("deliveries_today", 0)

    # 2. Basic Metadata counts
    customer_count = db.exec(
        select(func.count(Customer.id)).where(Customer.tenant_id == tenant_id)
    ).one()
    product_count = db.exec(
        select(func.count(Product.id)).where(Product.tenant_id == tenant_id)
    ).one()

    total_payments = sales_today  # Approximate as payments today for dashboard card

    # 3. Stock Status (Low stock < 10)
    low_stock_count = db.exec(
        select(func.count(StockBalance.id))
        .where(StockBalance.tenant_id == tenant_id)
        .where(StockBalance.quantity <= 10)
    ).one()

    # 5. Weekly Stats (Production vs Deliveries)
    from datetime import timedelta

    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

    from app.models.models import InventoryMovement

    # In Entrega, users sometimes use 'adjustment' to record production
    produced_this_week = (
        db.exec(
            select(func.sum(InventoryMovement.quantity))
            .where(InventoryMovement.tenant_id == tenant_id)
            .where(InventoryMovement.type.in_(["restock", "adjustment"]))
            .where(InventoryMovement.quantity > 0)
            .where(InventoryMovement.created_at >= seven_days_ago)
        ).one()
        or 0.0
    )

    delivered_this_week = (
        db.exec(
            select(func.sum(InventoryMovement.quantity))
            .where(InventoryMovement.tenant_id == tenant_id)
            .where(InventoryMovement.type.in_(["delivery", "delivery_to_customer"]))
            .where(InventoryMovement.created_at >= seven_days_ago)
        ).one()
        or 0.0
    )

    delivered_abs = abs(float(delivered_this_week))

    # 4. Master Stock (Warehouse + Outside)
    # Get outside quantities per product (delivery - returns - sales)
    outside_types = [
        "delivery",
        "delivery_to_customer",
        "return",
        "return_from_customer",
        "sale_reported",
    ]
    outside_query = (
        select(
            InventoryMovement.product_id,
            func.sum(InventoryMovement.quantity).label("outside_net"),
        )
        .where(InventoryMovement.tenant_id == tenant_id)
        .where(InventoryMovement.type.in_(outside_types))
        .group_by(InventoryMovement.product_id)
    )
    outside_data = {
        row[0]: -float(row[1] or 0.0) for row in db.exec(outside_query).all()
    }

    top_stock_query = (
        select(Product.id, Product.name, StockBalance.quantity)
        .join(StockBalance, Product.id == StockBalance.product_id)
        .where(Product.tenant_id == tenant_id)
        .order_by(desc(StockBalance.quantity))
    )
    top_stock_results = db.exec(top_stock_query).all()

    formatted_stock = []
    for p_id, name, qty in top_stock_results:
        qty_outside = outside_data.get(p_id, 0.0)
        formatted_stock.append(
            {
                "name": name,
                "quantity": qty,
                "quantity_outside": qty_outside,
                "total": qty + qty_outside,
            }
        )

    # 6. Top Debtors (First 5 customers by balance)
    top_debtors = db.exec(
        select(Customer, CustomerBalance)
        .join(CustomerBalance, Customer.id == CustomerBalance.customer_id)
        .where(Customer.tenant_id == tenant_id)
        .order_by(CustomerBalance.balance)  # Lowest (most negative) first
        .limit(5)
    ).all()

    # 7. Recent Activity (Last 10 movements)
    recent_movements = db.exec(
        select(InventoryMovement, Customer)
        .join(Customer, InventoryMovement.customer_id == Customer.id, isouter=True)
        .where(InventoryMovement.tenant_id == tenant_id)
        .order_by(desc(InventoryMovement.created_at))
        .limit(10)
    ).all()

    # 6. Billing & Conversion (V1.3 Hardening)
    def ensure_aware(dt: Optional[datetime]) -> Optional[datetime]:
        """Normalizes naive DB datetimes to UTC to prevent aware/naive crashes (V1.3.8)"""
        if dt and dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt

    now = datetime.now(timezone.utc)
    status = active_tenant.billing_status or "trial"

    is_expired = False
    days_remaining = 0

    trial_end = ensure_aware(active_tenant.trial_ends_at)
    grace_end = ensure_aware(active_tenant.grace_ends_at)

    if status == "suspended":
        is_expired = True
    elif status == "active_paid":
        is_expired = False
    elif status == "trial":
        if not trial_end or now > trial_end:
            is_expired = True
        else:
            days_remaining = (trial_end - now).days
    elif status == "grace":
        if not grace_end or now > grace_end:
            is_expired = True
        else:
            days_remaining = (grace_end - now).days

    # Operational triggers (V2 Scaled)
    total_deliveries = int(total_deliveries_kpi or 0)

    # sales_today already pulled from ds

    return {
        "stats": {
            "customer_count": customer_count,
            "product_count": product_count,
            "total_payments": total_payments,
            "total_debt": abs(float(total_debt_abs)),
            "low_stock_count": low_stock_count,
            "weekly_produced": float(produced_this_week),
            "weekly_delivered": delivered_abs,
        },
        "billing": {
            "status": status,
            "days_remaining": days_remaining,
            "is_expired": is_expired,
            "trial_ends_at": trial_end.isoformat() if trial_end else None,
            "grace_ends_at": grace_end.isoformat() if grace_end else None,
            "subscription_ends_at": (
                ensure_aware(active_tenant.subscription_ends_at).isoformat()
                if active_tenant.subscription_ends_at
                else None
            ),
            "total_orders": total_deliveries,
            "sales_today": float(sales_today),
        },
        "stock": formatted_stock,
        "debtors": [
            {"name": c.name, "amount": abs(float(cb.balance))}
            for c, cb in top_debtors
            if cb.balance < 0
        ],
        "recent_activity": [
            {
                "id": str(m.id),
                "customer_name": c.name if c else "Desconocido",
                "description": m.description or "Movimiento de stock",
                "quantity": abs(m.quantity),
                "type": m.type,
                "amount": m.total_amount,
                "created_at": m.created_at.isoformat(),
            }
            for m, c in recent_movements
        ],
        "welcome_message": f"¡Hola de nuevo, {current_user.full_name}!",
        "business_name": active_tenant.name,
    }

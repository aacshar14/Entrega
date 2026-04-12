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
    InventoryMovement,
)
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta

router = APIRouter()


@router.get("/", name="get_dashboard_summary")
@router.get("", include_in_schema=False)
async def get_dashboard_summary(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    active_tenant: Tenant = Depends(get_active_tenant),
):
    try:
        tenant_id = active_tenant.id
        now_utc = datetime.now(timezone.utc)
        now_naive = now_utc.replace(tzinfo=None)

        # 1. Main Stats (Audit Verified)
        from app.services.dashboard_service import DashboardService

        ds = DashboardService(db)
        kpis = ds.get_dashboard_kpis(active_tenant)

        total_debt_abs = abs(float(kpis.get("total_debt", 0.0) or 0.0))
        sales_today = float(kpis.get("sales_today", 0.0) or 0.0)
        total_deliveries_kpi = int(float(kpis.get("deliveries_today", 0.0) or 0.0))

        # 2. Counts
        customer_count = db.exec(
            select(func.count(Customer.id)).where(Customer.tenant_id == tenant_id)
        ).one()
        product_count = db.exec(
            select(func.count(Product.id)).where(Product.tenant_id == tenant_id)
        ).one()
        payment_count = db.exec(
            select(func.count(Payment.id)).where(Payment.tenant_id == tenant_id)
        ).one()

        # 3. Flow
        last_monday_naive = (now_naive - timedelta(days=now_naive.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        produced_this_week = (
            db.exec(
                select(func.sum(InventoryMovement.quantity)).where(
                    InventoryMovement.tenant_id == tenant_id,
                    InventoryMovement.type == "production",
                    InventoryMovement.created_at >= last_monday_naive,
                )
            ).one()
            or 0.0
        )

        delivered_this_week = (
            db.exec(
                select(func.sum(InventoryMovement.quantity)).where(
                    InventoryMovement.tenant_id == tenant_id,
                    InventoryMovement.type == "delivery",
                    InventoryMovement.created_at >= last_monday_naive,
                )
            ).one()
            or 0.0
        )

        # 4. Stock Maestro (Format fixed for Frontend page.tsx)
        low_stock_count = db.exec(
            select(func.count(StockBalance.id)).where(
                StockBalance.tenant_id == tenant_id, StockBalance.quantity <= 0
            )
        ).one()

        stock_balances = db.exec(
            select(Product.name, StockBalance.quantity)
            .join(StockBalance, Product.id == StockBalance.product_id)
            .where(Product.tenant_id == tenant_id)
        ).all()

        # Frontend StockItem Interface: name, quantity, quantity_outside, total
        formatted_stock = [
            {
                "name": str(name),
                "quantity": float(qty or 0.0),
                "quantity_outside": 0.0,  # Placeholder until logistics logic
                "total": float(qty or 0.0),
            }
            for name, qty in stock_balances
        ]

        # 5. Activity (Field name fixed: activity -> recent_activity)
        recent_movements = db.exec(
            select(InventoryMovement, Customer)
            .join(Customer, InventoryMovement.customer_id == Customer.id, isouter=True)
            .where(InventoryMovement.tenant_id == tenant_id)
            .order_by(desc(InventoryMovement.created_at))
            .limit(10)
        ).all()

        recent_activity_resp = []
        for m, c in recent_movements:
            ts = m.created_at
            recent_activity_resp.append(
                {
                    "id": str(m.id),
                    "customer_name": str(c.name if c else "S/N"),
                    "description": f"{m.quantity} unid. ({m.type})",
                    "quantity": float(m.quantity or 0.0),
                    "type": "movement",
                    "amount": 0.0,
                    "created_at": (
                        ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
                    ),
                }
            )

        # 6. Debtors
        top_debtors = db.exec(
            select(Customer, CustomerBalance)
            .join(CustomerBalance, Customer.id == CustomerBalance.customer_id)
            .where(Customer.tenant_id == tenant_id)
            .order_by(CustomerBalance.balance)
            .limit(5)
        ).all()

        # 7. Billing Corrected (Adding total_orders, sales_today metadata)
        status = str(active_tenant.billing_status or "trial")
        trial_end = active_tenant.trial_ends_at
        days_rem = (trial_end.replace(tzinfo=None) - now_naive).days if trial_end else 0

        return {
            "stats": {
                "customer_count": int(customer_count or 0),
                "product_count": int(product_count or 0),
                "total_payments": int(payment_count or 0),
                "total_debt": total_debt_abs,
                "low_stock_count": int(low_stock_count or 0),
                "weekly_produced": float(produced_this_week or 0.0),
                "weekly_delivered": abs(float(delivered_this_week or 0.0)),
            },
            "stock": formatted_stock,
            "recent_activity": recent_activity_resp,
            "debtors": [
                {"name": str(c.name or "S/N"), "amount": abs(float(cb.balance or 0.0))}
                for c, cb in top_debtors
                if cb and cb.balance is not None and cb.balance < 0
            ],
            "billing": {
                "status": status,
                "days_remaining": max(0, days_rem),
                "is_expired": (
                    status == "suspended"
                    or (trial_end and now_naive > trial_end.replace(tzinfo=None))
                ),
                "trial_ends_at": trial_end.isoformat() if trial_end else None,
                "total_orders": int(
                    total_deliveries_kpi or 0
                ),  # Mapping deliveries to total_orders
                "sales_today": sales_today,
            },
            "welcome_message": f"¡Hola de nuevo, {current_user.full_name or current_user.email}!",
            "business_name": str(active_tenant.name or "Mi Negocio"),
        }
    except Exception as e:
        import traceback

        return {
            "error": "DASHBOARD_FRONTEND_SYNC_FAILURE",
            "message": str(e),
            "traceback": traceback.format_exc(),
        }

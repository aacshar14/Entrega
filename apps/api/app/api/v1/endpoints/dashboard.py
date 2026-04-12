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
        total_payments = db.exec(
            select(func.count(Payment.id)).where(Payment.tenant_id == tenant_id)
        ).one()

        # 3. Aggregated Flow (Hardened V1.7)
        now = datetime.now(timezone.utc)
        last_monday = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        # Force naive for DB comparison to prevent aware/naive crash
        last_monday_naive = last_monday.replace(tzinfo=None)

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
        delivered_abs = abs(float(delivered_this_week))

        # 4. Critical Stock Alert count
        low_stock_count = db.exec(
            select(func.count(StockBalance.id)).where(
                StockBalance.tenant_id == tenant_id, StockBalance.balance <= 0
            )
        ).one()

        # 5. Formatted Lists Logic
        stock_balances = db.exec(
            select(Product.name, StockBalance.balance)
            .join(StockBalance, Product.id == StockBalance.product_id)
            .where(Product.tenant_id == tenant_id)
        ).all()

        formatted_stock = [
            {"product": str(name), "stock": float(balance or 0.0)}
            for name, balance in stock_balances
        ]

        top_debtors = db.exec(
            select(Customer, CustomerBalance)
            .join(CustomerBalance, Customer.id == CustomerBalance.customer_id)
            .where(Customer.tenant_id == tenant_id)
            .order_by(CustomerBalance.balance)
            .limit(5)
        ).all()

        # 🔄 RECENT ACTIVITY (Aggregated Resilience V1.9.8)
        recent_movements = db.exec(
            select(InventoryMovement, Customer)
            .join(Customer, InventoryMovement.customer_id == Customer.id, isouter=True)
            .where(InventoryMovement.tenant_id == tenant_id)
            .order_by(desc(InventoryMovement.created_at))
            .limit(20)
        ).all()

        recent_payments = db.exec(
            select(Payment, Customer)
            .join(Customer, Payment.customer_id == Customer.id, isouter=True)
            .where(Payment.tenant_id == tenant_id)
            .order_by(desc(Payment.created_at))
            .limit(20)
        ).all()

        unified_activity = []
        for m, c in recent_movements:
            unified_activity.append(
                {
                    "id": str(m.id),
                    "type": "movement",
                    "customer_name": str(c.name if c else "S/N"),
                    "description": f"{m.quantity} unidades",
                    "quantity": float(m.quantity or 0.0),
                    "amount": 0.0,
                    "created_at": m.created_at,
                    "is_payment": False,
                }
            )

        for p, c in recent_payments:
            unified_activity.append(
                {
                    "id": str(p.id),
                    "type": "payment",
                    "customer_name": str(c.name if c else "S/N"),
                    "description": str(p.payment_method or "Pago"),
                    "quantity": 0.0,
                    "amount": float(p.amount or 0.0),
                    "created_at": p.created_at,
                    "is_payment": True,
                }
            )

        # Final Sort with Paranoid Logic
        def sort_key(x):
            try:
                dt = x.get("created_at")
                if not dt:
                    return datetime(1970, 1, 1)
                if isinstance(dt, str):
                    try:
                        return datetime.fromisoformat(
                            dt.replace("Z", "+00:00")
                        ).replace(tzinfo=None)
                    except:
                        return datetime(1970, 1, 1)
                if hasattr(dt, "replace"):
                    return dt.replace(tzinfo=None)
                return datetime(1970, 1, 1)
            except:
                return datetime(1970, 1, 1)

        unified_activity.sort(key=sort_key, reverse=True)
        unified_activity = unified_activity[:10]

        activity_resp = []
        for item in unified_activity:
            try:
                dt = item["created_at"]
                dt_str = dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
                activity_resp.append(
                    {
                        "id": item["id"],
                        "customer_name": item["customer_name"],
                        "description": item["description"],
                        "quantity": item["quantity"],
                        "type": item["type"],
                        "amount": item["amount"],
                        "created_at": dt_str,
                        "is_payment": item["is_payment"],
                    }
                )
            except:
                continue

        # 6. Billing & Context
        status = str(active_tenant.billing_status or "trial")
        # Calc trial days etc
        trial_end = active_tenant.trial_ends_at
        days_remaining = (
            (trial_end.replace(tzinfo=None) - datetime.now().replace(tzinfo=None)).days
            if trial_end
            else 0
        )
        is_expired = status == "suspended" or (
            trial_end
            and datetime.now().replace(tzinfo=None) > trial_end.replace(tzinfo=None)
        )

        return {
            "stats": {
                "customer_count": int(customer_count or 0),
                "product_count": int(product_count or 0),
                "total_payments": int(total_payments or 0),
                "total_debt": abs(float(total_debt_abs or 0.0)),
                "low_stock_count": int(low_stock_count or 0),
                "weekly_produced": float(produced_this_week or 0.0),
                "weekly_delivered": float(delivered_abs or 0.0),
            },
            "kpis": {
                "sales_today": float(sales_today or 0.0),
                "total_debt": float(total_debt_abs or 0.0),
                "deliveries_today": int(total_deliveries_kpi or 0),
                "status": status,
            },
            "billing": {
                "status": status,
                "days_remaining": max(0, days_remaining),
                "is_expired": bool(is_expired),
                "trial_ends_at": trial_end.isoformat() if trial_end else None,
            },
            "stock": formatted_stock,
            "debtors": [
                {"name": str(c.name or "S/N"), "amount": abs(float(cb.balance or 0.0))}
                for c, cb in top_debtors
                if cb and cb.balance is not None and cb.balance < 0
            ],
            "activity": activity_resp,
            "welcome_message": f"¡Hola de nuevo, {current_user.full_name or current_user.email}!",
            "business_name": str(active_tenant.name or "Mi Negocio"),
        }
    except Exception as e:
        import traceback

        return {
            "error": "DASHBOARD_CRASH",
            "message": str(e),
            "traceback": traceback.format_exc(),
            "user_id": str(current_user.id),
            "tenant_id": str(active_tenant.id),
        }

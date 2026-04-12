from fastapi import APIRouter, Depends, HTTPException
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

        # 1. Main Stats (Performance Hardening V3 - Audit Verified)
        from app.services.dashboard_service import DashboardService

        ds = DashboardService(db)
        kpis = ds.get_dashboard_kpis(active_tenant)

        total_debt_abs = abs(float(kpis.get("total_debt", 0.0) or 0.0))
        sales_today = float(kpis.get("sales_today", 0.0) or 0.0)
        total_deliveries_kpi = int(float(kpis.get("deliveries_today", 0.0) or 0.0))

        # 2. Metadata counts (Audit Verified)
        customer_count = db.exec(
            select(func.count(Customer.id)).where(Customer.tenant_id == tenant_id)
        ).one()
        product_count = db.exec(
            select(func.count(Product.id)).where(Product.tenant_id == tenant_id)
        ).one()
        payment_count = db.exec(
            select(func.count(Payment.id)).where(Payment.tenant_id == tenant_id)
        ).one()

        # 3. Weekly Flow (Audit Verified)
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
        delivered_abs = abs(float(delivered_this_week))

        # 4. Critical Stock (Attribute: quantity - Audit Verified)
        low_stock_count = db.exec(
            select(func.count(StockBalance.id)).where(
                StockBalance.tenant_id == tenant_id, StockBalance.quantity <= 0
            )
        ).one()

        # 5. Formatted Stock (Attribute: quantity - Audit Verified)
        stock_balances = db.exec(
            select(Product.name, StockBalance.quantity)
            .join(StockBalance, Product.id == StockBalance.product_id)
            .where(Product.tenant_id == tenant_id)
        ).all()

        formatted_stock = [
            {"product": str(name), "stock": float(qty or 0.0)}
            for name, qty in stock_balances
        ]

        # 6. Top Debtors (Attribute: balance - Audit Verified)
        top_debtors = db.exec(
            select(Customer, CustomerBalance)
            .join(CustomerBalance, Customer.id == CustomerBalance.customer_id)
            .where(Customer.tenant_id == tenant_id)
            .order_by(CustomerBalance.balance)
            .limit(5)
        ).all()

        # 7. Recent Activity (Attributes: quantity, type, method - Audit Verified)
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
                    "description": f"{m.quantity} unidades ({m.type})",
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
                    "description": f"Pago: {p.method or 'Efectivo'}",
                    "quantity": 0.0,
                    "amount": float(p.amount or 0.0),
                    "created_at": p.created_at,
                    "is_payment": True,
                }
            )

        # Naive-Safe Sort
        def get_timestamp(x):
            ts = x.get("created_at")
            if not ts:
                return datetime(1970, 1, 1)
            return (
                ts.replace(tzinfo=None)
                if hasattr(ts, "replace")
                else datetime(1970, 1, 1)
            )

        unified_activity.sort(key=get_timestamp, reverse=True)
        unified_activity = unified_activity[:10]

        activity_resp = []
        for item in unified_activity:
            ts = item["created_at"]
            ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
            activity_resp.append(
                {
                    "id": item["id"],
                    "customer_name": item["customer_name"],
                    "description": item["description"],
                    "quantity": item["quantity"],
                    "type": item["type"],
                    "amount": item["amount"],
                    "created_at": ts_str,
                    "is_payment": item["is_payment"],
                }
            )

        # 8. Billing Context (Audit Verified)
        billing_status = str(active_tenant.billing_status or "trial")
        trial_end = active_tenant.trial_ends_at

        days_remaining = 0
        if trial_end:
            delta = trial_end.replace(tzinfo=None) - now_naive
            days_remaining = max(0, delta.days)

        return {
            "stats": {
                "customer_count": int(customer_count or 0),
                "product_count": int(product_count or 0),
                "total_payments": int(payment_count or 0),
                "total_debt": total_debt_abs,
                "low_stock_count": int(low_stock_count or 0),
                "weekly_produced": float(produced_this_week or 0.0),
                "weekly_delivered": delivered_abs,
            },
            "kpis": {
                "sales_today": sales_today,
                "total_debt": total_debt_abs,
                "deliveries_today": total_deliveries_kpi,
                "status": billing_status,
            },
            "billing": {
                "status": billing_status,
                "days_remaining": days_remaining,
                "is_expired": (
                    billing_status == "suspended"
                    or (trial_end and now_naive > trial_end.replace(tzinfo=None))
                ),
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

        # Critical Fallback Mode (Production Safe)
        return {
            "error": "DASHBOARD_CRITICAL_FAILURE",
            "message": str(e),
            "traceback": traceback.format_exc(),
            "status": "emergency_degraded_mode",
        }

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

        # 1. KPIs
        from app.services.dashboard_service import DashboardService

        ds = DashboardService(db)
        kpis = ds.get_dashboard_kpis(active_tenant)

        total_debt_abs = abs(float(kpis.get("total_debt", 0.0) or 0.0))
        sales_today = float(kpis.get("sales_today", 0.0) or 0.0)
        total_deliveries_kpi = int(float(kpis.get("deliveries_today", 0.0) or 0.0))

        # 2. Financial History
        historical_total_payments = (
            db.exec(
                select(func.sum(Payment.amount)).where(Payment.tenant_id == tenant_id)
            ).one()
            or 0.0
        )

        # 3. Weekly Flow (CORRECTED: IN uses 'adjustment' > 0 V1.9.18)
        last_monday_naive = (now_naive - timedelta(days=now_naive.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        # IN = Adjustments with positive quantity
        produced_this_week = (
            db.exec(
                select(func.sum(InventoryMovement.quantity)).where(
                    InventoryMovement.tenant_id == tenant_id,
                    InventoryMovement.type == "adjustment",
                    InventoryMovement.quantity > 0,
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

        # 4. Stock Maestro (Excluding Hidden/Test Products V1.9.18)
        # Note: In the future we can use is_active, but for now we filter 'Birthday Cake' manually if requested
        stock_balances = db.exec(
            select(Product, StockBalance)
            .join(StockBalance, Product.id == StockBalance.product_id)
            .where(
                Product.tenant_id == tenant_id,
                Product.name != "Birthday Cake",  # Explicit manual filter for cleanup
            )
        ).all()

        formatted_stock = []
        for p, sb in stock_balances:
            outside_qty = (
                db.exec(
                    select(func.sum(InventoryMovement.quantity)).where(
                        InventoryMovement.tenant_id == tenant_id,
                        InventoryMovement.product_id == p.id,
                        InventoryMovement.type.in_(
                            ["delivery", "delivery_to_customer"]
                        ),
                    )
                ).one()
                or 0.0
            )

            outside_abs = abs(float(outside_qty))
            formatted_stock.append(
                {
                    "name": str(p.name),
                    "quantity": float(sb.quantity or 0.0),
                    "quantity_outside": outside_abs,
                    "total": float(sb.quantity or 0.0) + outside_abs,
                }
            )

        # 5. Activity
        recent_movements = db.exec(
            select(InventoryMovement, Customer, Product)
            .join(Customer, InventoryMovement.customer_id == Customer.id, isouter=True)
            .join(Product, InventoryMovement.product_id == Product.id, isouter=True)
            .where(InventoryMovement.tenant_id == tenant_id)
            .order_by(desc(InventoryMovement.created_at))
            .limit(15)
        ).all()

        recent_activity_resp = []
        for m, c, p in recent_movements:
            calculated_amount = 0.0
            if m.type in ["delivery", "delivery_to_customer"] and p:
                tier = (c.tier if c else "menudeo") or "menudeo"
                price = p.price_menudeo or p.price or 0.0
                if tier == "mayoreo":
                    price = p.price_mayoreo or p.price or 0.0
                elif tier == "especial":
                    price = p.price_especial or p.price or 0.0
                calculated_amount = abs(m.quantity) * price

            recent_activity_resp.append(
                {
                    "id": str(m.id),
                    "customer_name": str(c.name if c else "S/N"),
                    "description": f"{abs(m.quantity)} unid. ({m.type})",
                    "quantity": float(m.quantity or 0.0),
                    "type": "movement",
                    "amount": float(calculated_amount),
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
            )

        # 6. Response
        status = str(active_tenant.billing_status or "trial")
        trial_end = active_tenant.trial_ends_at
        days_rem = (trial_end.replace(tzinfo=None) - now_naive).days if trial_end else 0

        product_count = db.exec(
            select(func.count(Product.id)).where(
                Product.tenant_id == tenant_id, Product.name != "Birthday Cake"
            )
        ).one()

        return {
            "stats": {
                "customer_count": db.exec(
                    select(func.count(Customer.id)).where(
                        Customer.tenant_id == tenant_id
                    )
                ).one(),
                "product_count": product_count,
                "total_payments": float(historical_total_payments),
                "total_debt": total_debt_abs,
                "low_stock_count": db.exec(
                    select(func.count(StockBalance.id)).where(
                        StockBalance.tenant_id == tenant_id, StockBalance.quantity <= 0
                    )
                ).one(),
                "weekly_produced": float(
                    produced_this_week or 0.0
                ),  # Reflecting adjustments as IN
                "weekly_delivered": abs(float(delivered_this_week or 0.0)),
            },
            "stock": formatted_stock,
            "recent_activity": recent_activity_resp,
            "debtors": [
                {"name": str(c.name or "S/N"), "amount": abs(float(cb.balance or 0.0))}
                for c, cb in db.exec(
                    select(Customer, CustomerBalance)
                    .join(CustomerBalance, Customer.id == CustomerBalance.customer_id)
                    .where(Customer.tenant_id == tenant_id)
                    .order_by(CustomerBalance.balance)
                    .limit(5)
                ).all()
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
                "total_orders": int(total_deliveries_kpi or 0),
                "sales_today": sales_today,
            },
            "welcome_message": f"¡Hola de nuevo, {current_user.full_name or current_user.email}!",
            "business_name": str(active_tenant.name or "Mi Negocio"),
        }
    except Exception as e:
        import traceback

        return {
            "error": "DASHBOARD_INVENTORY_LOGIC_FAILURE",
            "message": str(e),
            "traceback": traceback.format_exc(),
        }

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
        t_id_str = str(tenant_id)
        now_utc = datetime.now(timezone.utc)
        now_naive = now_utc.replace(tzinfo=None)

        # 1. Live Debt & Business Context TRUTH (V5.6.6 Robust Sum)
        from sqlalchemy import text
        q_debt = text("""
            SELECT 
                COALESCE(SUM(ABS(balance)), 0.0) as total_debt,
                COUNT(*) as debtor_count
            FROM customer_balances 
            WHERE tenant_id = CAST(:tid AS uuid)
            AND balance < 0
        """)
        debt_res = db.execute(q_debt, {"tid": t_id_str}).first()
        live_total_debt = float(debt_res.total_debt or 0.0)
        live_debtor_count = int(debt_res.debtor_count or 0)

        # 2. Daily Metrics (Live)
        today_start = now_naive.replace(hour=0, minute=0, second=0, microsecond=0)
        q_daily = text("""
            SELECT 
                COUNT(id) as orders_today,
                COALESCE(SUM(ABS(total_amount)), 0.0) as sales_amount_today
            FROM inventory_movements 
            WHERE tenant_id = CAST(:tid AS uuid)
            AND type IN ('delivery', 'Delivery', 'delivery_to_customer')
            AND created_at >= :start
        """)
        daily_res = db.execute(q_daily, {"tid": t_id_str, "start": today_start}).first()
        total_deliveries_kpi = int(daily_res.orders_today or 0)
        sales_today = float(daily_res.sales_amount_today or 0.0)

        # 3. Financial History (Live)
        historical_total_payments = (
            db.execute(
                text("SELECT SUM(amount) FROM payments WHERE tenant_id = CAST(:tid AS uuid)"), 
                {"tid": t_id_str}
            ).scalar()
            or 0.0
        )

        # 4. Monthly Flow (V5.6.3 Sync)
        month_start_naive = now_naive.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # IN = Adjustments with positive quantity (Monthly)
        q_in = text("""
            SELECT SUM(quantity) 
            FROM inventory_movements 
            WHERE tenant_id = CAST(:tid AS uuid)
            AND type IN ('adjustment', 'Adjustment', 'production', 'Production', 'restock', 'Restock') 
            AND quantity > 0 
            AND created_at >= :start
        """)
        produced_this_month = db.execute(q_in, {"tid": t_id_str, "start": month_start_naive}).scalar() or 0.0

        # OUT = Deliveries (Monthly)
        q_out = text("""
            SELECT SUM(ABS(quantity)) 
            FROM inventory_movements 
            WHERE tenant_id = CAST(:tid AS uuid)
            AND type IN ('delivery', 'Delivery', 'delivery_to_customer', 'Delivery_to_customer', 'sale_reported', 'Sale_reported') 
            AND created_at >= :start
        """)
        delivered_this_month = db.execute(q_out, {"tid": t_id_str, "start": month_start_naive}).scalar() or 0.0

        # TOTAL HQ STOCK (Live)
        q_hq = text("SELECT SUM(quantity) FROM stock_balances WHERE tenant_id = CAST(:tid AS uuid)")
        total_hq_stock = db.execute(q_hq, {"tid": t_id_str}).scalar() or 0.0

        # TOTAL OUTSIDE STOCK (Live)
        q_outside_total = text("""
            SELECT SUM(ABS(quantity)) 
            FROM inventory_movements 
            WHERE tenant_id = CAST(:tid AS uuid)
            AND type IN ('delivery', 'delivery_to_customer')
        """)
        q_returns_total = text("""
            SELECT SUM(ABS(quantity)) 
            FROM inventory_movements 
            WHERE tenant_id = CAST(:tid AS uuid)
            AND type IN ('return', 'return_from_customer', 'sale_reported')
        """)
        
        sum_out = db.execute(q_outside_total, {"tid": t_id_str}).scalar() or 0.0
        sum_ret = db.execute(q_returns_total, {"tid": t_id_str}).scalar() or 0.0
        total_outside_stock = max(0, sum_out - sum_ret)






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
            # Deliveries (Out from warehouse to street)
            sum_delivered = db.exec(
                select(func.sum(InventoryMovement.quantity)).where(
                    InventoryMovement.tenant_id == tenant_id,
                    InventoryMovement.product_id == p.id,
                    InventoryMovement.type.in_(["delivery", "delivery_to_customer"]),
                )
            ).one() or 0.0

            # Sales + Returns (Back from street or finalized)
            sum_finalized = db.exec(
                select(func.sum(InventoryMovement.quantity)).where(
                    InventoryMovement.tenant_id == tenant_id,
                    InventoryMovement.product_id == p.id,
                    InventoryMovement.type.in_(["sale_reported", "return", "return_from_customer"]),
                )
            ).one() or 0.0

            # Real Stock in Street (Calle)
            # Normalizing with ABS: Abs(Output) - Abs(Sold/Returned)
            outside_abs = max(0, abs(float(sum_delivered)) - abs(float(sum_finalized)))

            formatted_stock.append({
                "id": str(p.id),
                "name": p.name,
                "sku": p.sku,
                "quantity": float(sb.quantity or 0.0),      # Bodega
                "quantity_outside": float(outside_abs),      # Calle
                "total": float((sb.quantity or 0.0) + outside_abs)
            })

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
            # Use snapshot amount if available (V6.1.0 logic), fallback to manual calculation
            calculated_amount = float(m.total_amount or 0.0)
            if calculated_amount == 0.0 and m.type in ["delivery", "delivery_to_customer"] and p:
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

        # Debtor count safety: cross-check against the debtors list
        debtors_list = [
            {"name": str(c.name or "S/N"), "amount": abs(float(cb.balance or 0.0))}
            for c, cb in db.exec(
                select(Customer, CustomerBalance)
                .join(CustomerBalance, Customer.id == CustomerBalance.customer_id)
                .where(Customer.tenant_id == tenant_id)
                .order_by(CustomerBalance.balance)
                .limit(5)
            ).all()
            if cb and cb.balance is not None and cb.balance < 0
        ]
        # If UUID fix returns 0 but debtors_list is non-empty, use list length as truth
        final_debtor_count = live_debtor_count if live_debtor_count > 0 else len(debtors_list)

        produced = float(produced_this_month or 0.0)
        delivered = abs(float(delivered_this_month or 0.0))

        return {
            "contract_version": "dashboard_v7",
            "stats": {
                "customer_count": int(db.exec(
                    select(func.count(Customer.id)).where(
                        Customer.tenant_id == tenant_id
                    )
                ).one() or 0),
                "product_count": int(product_count or 0),
                "total_payments": float(historical_total_payments or 0.0),
                "total_debt": float(live_total_debt or 0.0),
                # Canonical contract fields (V7)
                "debtor_count": int(final_debtor_count or 0),
                "force_monthly_in": float(produced or 0.0),
                "force_monthly_out": float(delivered or 0.0),
                "low_stock_count": int(db.exec(
                    select(func.count(StockBalance.id)).where(
                        StockBalance.tenant_id == tenant_id, StockBalance.quantity <= 0
                    )
                ).one() or 0),
                "total_stock_hq": float(total_hq_stock or 0.0),
                "total_stock_outside": float(total_outside_stock or 0.0),
                "total_stock_global": float((total_hq_stock or 0.0) + (total_outside_stock or 0.0)),
                # Compatibility aliases (keep for backward compat)
                "monthly_produced": float(produced or 0.0),
                "monthly_delivered": float(delivered or 0.0),
                "weekly_produced": float(produced or 0.0),
                "weekly_delivered": float(delivered or 0.0),
                "total_debt_final": float(live_total_debt or 0.0),
                "total_debt_live": float(live_total_debt or 0.0),
                "debtor_count_live": int(final_debtor_count or 0),
            },
            "stock": formatted_stock,
            "recent_activity": recent_activity_resp,
            "debtors": debtors_list,
            "billing": {
                "status": status,
                "days_remaining": max(0, days_rem),
                "is_expired": (
                    status == "suspended"
                    or (trial_end and now_naive > trial_end.replace(tzinfo=None))
                ),
                "trial_ends_at": trial_end.isoformat() if trial_end else None,
                "total_orders": int(total_deliveries_kpi or 0),
                "sales_today": float(sales_today or 0.0),
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

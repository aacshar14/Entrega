"""
Read current stock_balances state from production Supabase.
Read-only. No mutations.
"""
import os
from sqlmodel import Session, create_engine, text

DATABASE_URL = "postgresql://postgres.dynpljsdgpebrzvhmzlj:uScenOWklzKwOgyn@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

engine = create_engine(DATABASE_URL, echo=False)

with Session(engine) as session:
    # 1. Current stock_balances
    print("\n=== STOCK BALANCES (current persisted warehouse qty) ===")
    rows = session.execute(text("""
        SELECT
            t.slug AS tenant,
            p.sku,
            p.name AS product_name,
            sb.quantity AS warehouse_qty,
            sb.last_updated,
            sb.id AS balance_id,
            sb.tenant_id,
            sb.product_id
        FROM stock_balances sb
        JOIN products p ON p.id = sb.product_id
        JOIN tenants t ON t.id = sb.tenant_id
        ORDER BY t.slug, p.sku
    """)).all()
    for r in rows:
        print(f"tenant={r.tenant} | sku={r.sku} | name={r.product_name} | warehouse_qty={r.warehouse_qty} | last_updated={r.last_updated}")
        print(f"  balance_id={r.balance_id} | tenant_id={r.tenant_id} | product_id={r.product_id}")

    # 2. Derived outside stock from movements
    print("\n=== DERIVED OUTSIDE STOCK (from inventory_movements) ===")
    outside_rows = session.execute(text("""
        SELECT
            t.slug AS tenant,
            p.sku,
            p.name AS product_name,
            COALESCE(SUM(
                CASE
                    WHEN im.type IN ('delivery', 'delivery_to_customer') THEN ABS(im.quantity)
                    WHEN im.type IN ('return', 'return_from_customer', 'sale_reported') THEN -ABS(im.quantity)
                    ELSE 0
                END
            ), 0) AS outside_derived
        FROM products p
        JOIN tenants t ON t.id = p.tenant_id
        LEFT JOIN inventory_movements im ON im.product_id = p.id AND im.tenant_id = p.tenant_id
        GROUP BY t.slug, p.sku, p.name
        ORDER BY t.slug, p.sku
    """)).all()
    for r in outside_rows:
        print(f"tenant={r.tenant} | sku={r.sku} | outside_derived={r.outside_derived}")

    # 3. Combined totals
    print("\n=== TOTALS PER TENANT ===")
    total_rows = session.execute(text("""
        SELECT
            t.slug AS tenant,
            SUM(sb.quantity) AS total_warehouse,
            COALESCE((
                SELECT SUM(
                    CASE
                        WHEN im.type IN ('delivery','delivery_to_customer') THEN ABS(im.quantity)
                        WHEN im.type IN ('return','return_from_customer','sale_reported') THEN -ABS(im.quantity)
                        ELSE 0
                    END
                )
                FROM inventory_movements im
                JOIN products p2 ON p2.id = im.product_id
                WHERE p2.tenant_id = t.id
            ), 0) AS total_outside
        FROM stock_balances sb
        JOIN tenants t ON t.id = sb.tenant_id
        GROUP BY t.slug, t.id
        ORDER BY t.slug
    """)).all()
    for r in total_rows:
        print(f"tenant={r.tenant} | warehouse={r.total_warehouse} | outside={r.total_outside} | total={r.total_warehouse + r.total_outside}")

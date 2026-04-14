from sqlalchemy import text
from app.core.db import engine

def deep_data_audit():
    print("--- 🚨 CRITICAL DATA LOSS AUDIT (APRIL 8/9) ---")
    
    tables = [
        "tenants",
        "products", 
        "customers", 
        "inventory_movements", 
        "payments", 
        "customer_balances", 
        "stock_balances",
        "metric_snapshots"
    ]
    
    with engine.connect() as conn:
        for table in tables:
            print(f"\n[Table: {table}]")
            try:
                # 1. Check total rows
                total = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                
                # 2. Check for April 8/9 specifically
                april_data = conn.execute(text(f"""
                    SELECT id, tenant_id, created_at 
                    FROM {table} 
                    WHERE created_at >= '2026-04-07' AND created_at <= '2026-04-10'
                    LIMIT 5
                """)).fetchall()
                
                print(f" -> Total rows in system: {total}")
                print(f" -> April 8/9 records found: {len(april_data)}")
                for r in april_data:
                    print(f"    ID: {r[0]} | TenantID: {r[1]} | Created: {r[2]}")
                
                # 3. Unique Tenant IDs in this table
                tenants = conn.execute(text(f"SELECT DISTINCT tenant_id FROM {table}")).fetchall()
                print(f" -> Active Tenant IDs in this table: {[t[0] for t in tenants]}")
                
            except Exception as e:
                print(f" -> Error auditing {table}: {str(e)}")

if __name__ == "__main__":
    deep_data_audit()

from sqlalchemy import text
from app.core.db import engine

def audit_dashboard_inconsistency():
    TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"
    print(f"--- DASHBOARD INCONSISTENCY AUDIT [Tenant: {TID}] ---")
    
    with engine.connect() as conn:
        # 1. REALITY CHECK: Products
        p_count = conn.execute(text("SELECT COUNT(*) FROM products WHERE tenant_id = :tid AND name != 'Birthday Cake'"), {"tid": TID}).scalar()
        print(f"REALITY: Product Count = {p_count}")
        
        # 2. REALITY CHECK: Total Debt
        debt = conn.execute(text("SELECT SUM(balance) FROM customer_balances WHERE tenant_id = :tid AND balance < 0"), {"tid": TID}).scalar()
        print(f"REALITY: Total Debt = {abs(float(debt or 0.0))}")
        
        # 3. CACHE CHECK: Snapshots
        print("\n[Metric Snapshots Cache]")
        res = conn.execute(text("""
            SELECT metric_name, metric_value, period_start 
            FROM metric_snapshots 
            WHERE tenant_id = :tid 
            AND period_start >= CURRENT_DATE
        """), {"tid": TID}).fetchall()
        
        if not res:
            print("CACHE: No snapshots found for today.")
        else:
            for r in res:
                print(f"CACHE: Metric={r[0]} | Value={r[1]} | Date={r[2]}")

if __name__ == "__main__":
    audit_dashboard_inconsistency()

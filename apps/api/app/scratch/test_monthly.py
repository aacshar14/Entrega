from sqlalchemy import text
from app.core.db import engine
from datetime import datetime

def test_monthly():
    TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"
    now = datetime.now()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    print(f"--- TESTING MONTHLY AGGREGATION ---")
    print(f"Start Date: {start}")
    
    with engine.connect() as conn:
        in_qty = conn.execute(text("""
            SELECT SUM(quantity) 
            FROM inventory_movements 
            WHERE tenant_id = :tid 
            AND type = 'adjustment' 
            AND quantity > 0 
            AND created_at >= :start
        """), {"tid": TID, "start": start}).scalar()
        
        out_qty = conn.execute(text("""
            SELECT SUM(quantity) 
            FROM inventory_movements 
            WHERE tenant_id = :tid 
            AND type = 'delivery' 
            AND created_at >= :start
        """), {"tid": TID, "start": start}).scalar()
        
        print(f"AGGREGATION TRUTH: IN={in_qty or 0.0} | OUT={abs(float(out_qty or 0.0))}")

if __name__ == "__main__":
    test_monthly()

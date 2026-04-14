from sqlalchemy import text
from app.core.db import engine
from datetime import datetime

def banner_audit():
    TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"
    now = datetime.now()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    print(f"--- BANNER DATA AUDIT [Tenant: {TID}] ---")
    print(f"Filter Start: {start}")
    
    with engine.connect() as conn:
        # 1. Row count for deliveries
        q_count = conn.execute(text("""
            SELECT COUNT(id) 
            FROM inventory_movements 
            WHERE tenant_id = :tid 
            AND type IN ('delivery', 'Delivery') 
            AND created_at >= :start
        """), {"tid": TID, "start": start}).scalar()
        
        # 2. Raw list of delivery created_at
        q_rows = conn.execute(text("""
            SELECT created_at, type, quantity 
            FROM inventory_movements 
            WHERE tenant_id = :tid 
            AND type IN ('delivery', 'Delivery') 
            ORDER BY created_at DESC 
            LIMIT 5
        """), {"tid": TID}).fetchall()
        
        print(f"Count with Date Filter: {q_count}")
        print("\nLast 5 Deliveries (No Date Filter):")
        for r in q_rows:
            print(f"Date: {r[0]} | Type: {r[1]} | Qty: {r[2]}")
            if r[0] < start:
                print(f"  !! Fails Filter ( {r[0]} < {start} )")
            else:
                print(f"  >> Passes Filter")

if __name__ == "__main__":
    banner_audit()

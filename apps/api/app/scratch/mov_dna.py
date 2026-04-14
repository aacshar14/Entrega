from sqlalchemy import text
from app.core.db import engine

def audit_movements():
    TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"
    print(f"--- MOVEMENT DNA AUDIT [Tenant: {TID}] ---")
    
    with engine.connect() as conn:
        res = conn.execute(text("""
            SELECT type, quantity, created_at, id 
            FROM inventory_movements 
            WHERE tenant_id = :tid 
            AND created_at >= '2026-04-01'
        """), {"tid": TID}).fetchall()
        
        print(f"Total movements this month: {len(res)}")
        for r in res:
            print(f"Type: {r[0]} | Qty: {r[1]} | Date: {r[2]} | ID: {r[3]}")

if __name__ == "__main__":
    audit_audit_movements = audit_movements()


from app.core.db import engine
from sqlalchemy import text
from datetime import datetime

TENANT_ID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def debug_final():
    with engine.connect() as conn:
        print("\n--- AUDITORÍA DE MOVIMIENTOS HOY (14 ABRIL) ---")
        res = conn.execute(text("""
            SELECT id, type, quantity, created_at, description 
            FROM inventory_movements 
            WHERE tenant_id = :tid 
            AND created_at >= CURRENT_DATE
        """), {"tid": TENANT_ID}).all()
        
        sum_qty = 0
        for r in res:
            print(f"- ID: {r.id} | Type: {r.type} | Qty: {r.quantity} | Desc: {r.description}")
            if r.type in ['adjustment', 'production'] and r.quantity > 0:
                sum_qty += r.quantity
        
        print(f"\nTOTAL 'IN' CALCULADO PARA HOY: {sum_qty}")

if __name__ == "__main__":
    debug_final()

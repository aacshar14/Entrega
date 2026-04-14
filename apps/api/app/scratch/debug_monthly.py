
from app.core.db import engine
from sqlalchemy import text
from datetime import datetime, timezone

TENANT_ID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def debug_monthly_flow():
    with engine.connect() as conn:
        now = datetime.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        print(f"--- DEBUG FLUJO MENSUAL (Desde {start_of_month}) ---")
        
        # Query idéntico al del backend
        res = conn.execute(text("""
            SELECT SUM(quantity) 
            FROM inventory_movements 
            WHERE tenant_id = :tid 
            AND type IN ('adjustment', 'Adjustment', 'production', 'Production') 
            AND quantity > 0 
            AND created_at >= :start
        """), {"tid": TENANT_ID, "start": start_of_month}).scalar()
        
        print(f"Resultado del Query: {res}")
        
        # Ver movimientos de hoy
        mobs = conn.execute(text("""
            SELECT type, quantity, created_at, description 
            FROM inventory_movements 
            WHERE tenant_id = :tid AND created_at >= :start
            ORDER BY created_at DESC
        """), {"tid": TENANT_ID, "start": start_of_month}).all()
        
        for m in mobs:
            print(f"- Type: {m.type} | Qty: {m.quantity} | Date: {m.created_at} | Desc: {m.description}")

if __name__ == "__main__":
    debug_monthly_flow()

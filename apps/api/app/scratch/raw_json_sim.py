
from app.core.db import engine
from sqlalchemy import text
from datetime import datetime, timezone
import json

# Simular la lógica de app/api/v1/endpoints/dashboard.py
def simulate_dashboard():
    tenant_id = "923eae6a-8157-4995-96ff-0da24a82e9e1"
    now_utc = datetime.now(timezone.utc)
    now_naive = now_utc.replace(tzinfo=None)
    month_start_naive = now_naive.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    with engine.connect() as conn:
        q_in = text("""
            SELECT SUM(quantity) 
            FROM inventory_movements 
            WHERE tenant_id = :tid 
            AND type IN ('adjustment', 'Adjustment', 'production', 'Production') 
            AND quantity > 0 
            AND created_at >= :start
        """)
        produced = conn.execute(q_in, {"tid": tenant_id, "start": month_start_naive}).scalar() or 0.0
        
        print(f"DEBUG BACKEND SIM:")
        print(f"- Start of Month: {month_start_naive}")
        print(f"- Produced (IN): {produced}")
        
        # Ver si hay un problema con el tipo de dato
        print(f"- Tipo de dato 'produced': {type(produced)}")

if __name__ == "__main__":
    simulate_dashboard()

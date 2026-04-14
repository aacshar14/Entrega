
from sqlmodel import Session, select
from app.core.db import engine
from app.models.models import InventoryMovement
from sqlalchemy import text

TENANT_ID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def audit():
    with Session(engine) as session:
        q = text("""
            SELECT customer_name_snapshot, quantity, unit_price, total_amount, created_at, type
            FROM inventory_movements 
            WHERE tenant_id = :tid AND customer_name_snapshot = 'Olympus Gym'
            ORDER BY created_at DESC
        """)
        res = session.execute(q, {"tid": TENANT_ID}).all()
        drift_found = False
        for name, qty, up, amt, date, mtype in res:
            expected = abs(qty) * up
            name_v = str(name) if name else "SYSTEM"
            type_v = str(mtype) if mtype else "ADJ"
            print(f"- {date} | {name_v:.<25} | {type_v:.<10} | Q:{qty:<4} | UP:${up:<5} | Total:${amt}")
            if abs(amt - expected) > 0.01:
                drift_found = True
                print(f"!!! DRIFT DETECTED !!! Expected: {expected}")
        
        if not drift_found:
            print("No se encontró desviación en los cálculos de movimientos.")

if __name__ == "__main__":
    audit()

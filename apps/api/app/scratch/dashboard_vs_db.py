
from app.core.db import engine
from sqlalchemy import text

def check_triggers():
    with engine.connect() as conn:
        print("\n--- TRIGGERS EN INVENTORY_MOVEMENTS ---")
        res = conn.execute(text("""
            SELECT trigger_name, event_manipulation 
            FROM information_schema.triggers 
            WHERE event_object_table = 'inventory_movements'
        """)).all()
        if not res:
            print("No se encontraron triggers en inventory_movements.")
        for r in res:
            print(f"- {r.trigger_name} | Event: {r.event_manipulation}")
        
        print("\n--- TRIGGERS EN PAYMENTS ---")
        res = conn.execute(text("""
            SELECT trigger_name, event_manipulation 
            FROM information_schema.triggers 
            WHERE event_object_table = 'payments'
        """)).all()
        for r in res:
            print(f"- {r.trigger_name} | Event: {r.event_manipulation}")

if __name__ == "__main__":
    check_triggers()

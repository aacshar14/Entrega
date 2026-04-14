
from app.core.db import engine
from sqlalchemy import text
import uuid

TENANT_ID = "923eae6a-8157-4995-96ff-0da24a82e9e1"
CHOCOCHIP_ID = "d90080c6-cc9c-4379-a4ab-c6a66c995ecb"

def total_rescue():
    with engine.connect() as conn:
        print("--- INICIANDO RESCATE DE DATOS CHOCÓBITOS V3 ---")
        
        # 1. Asignar ChocoChip a todos los movimientos que no tengan producto en este tenant
        res = conn.execute(text("""
            UPDATE inventory_movements 
            SET product_id = :pid 
            WHERE tenant_id = :tid AND product_id IS NULL
        """), {"pid": CHOCOCHIP_ID, "tid": TENANT_ID})
        print(f"- {res.rowcount} movimientos huérfanos asignados a ChocoChip.")

        # 2. Sincronizar Stock Balances
        # Verificar si existe
        exists = conn.execute(text("""
            SELECT 1 FROM stock_balances WHERE tenant_id = :tid AND product_id = :pid
        """), {"tid": TENANT_ID, "pid": CHOCOCHIP_ID}).first()
        
        if not exists:
            conn.execute(text("""
                INSERT INTO stock_balances (id, tenant_id, product_id, quantity, last_updated)
                VALUES (:id, :tid, :pid, 0, NOW())
            """), {"id": str(uuid.uuid4()), "tid": TENANT_ID, "pid": CHOCOCHIP_ID})
            print("- balance de stock creado para ChocoChip.")

        # Calculamos el real_stock sumando movimientos
        real_stock = conn.execute(text("""
            SELECT SUM(quantity) FROM inventory_movements 
            WHERE tenant_id = :tid AND product_id = :pid
        """), {"tid": TENANT_ID, "pid": CHOCOCHIP_ID}).scalar() or 0.0
        
        conn.execute(text("""
            UPDATE stock_balances 
            SET quantity = :val, last_updated = NOW()
            WHERE tenant_id = :tid AND product_id = :pid
        """), {"val": real_stock, "tid": TENANT_ID, "pid": CHOCOCHIP_ID})
        print(f"- Stock de ChocoChip sincronizado a {real_stock} unidades.")

        conn.commit()
        print("--- RESCATE COMPLETADO ---")

if __name__ == "__main__":
    total_rescue()

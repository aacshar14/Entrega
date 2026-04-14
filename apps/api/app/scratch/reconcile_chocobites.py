
from app.core.db import engine
from sqlalchemy import text
import uuid

TENANT_ID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def reconcile():
    with engine.connect() as conn:
        print("--- INICIANDO RECONCILIACIÓN CHOCÓBITOS V2 ---")
        
        # 1. Registrar Producción Inicial (200 galletas)
        conn.execute(text("""
            INSERT INTO inventory_movements 
            (id, tenant_id, quantity, unit_price, total_amount, type, description, created_at, updated_at)
            VALUES 
            (:move_id, :tid, 200, 0, 0, 'adjustment', 'Carga inicial producción (Reconciliación)', NOW(), NOW())
        """), {
            "move_id": str(uuid.uuid4()), 
            "tid": TENANT_ID
        })
        print("- Producción de 200 galletas registrada.")

        # 2. Ajustar los $40 de Olympus Gym para llegar a la deuda neta de $3,394
        # (3434 - 40 = 3394)
        olympus_id = "89f43229-0b42-4b97-bfc9-be871c20cae3"
        conn.execute(text("""
            INSERT INTO inventory_movements 
            (id, tenant_id, customer_id, customer_name_snapshot, quantity, unit_price, total_amount, type, description, created_at, updated_at)
            VALUES 
            (:move_id, :tid, :cid, 'Olympus Gym', 0, 0, -40, 'adjustment', 'Ajuste conciliación inicial', NOW(), NOW())
        """), {
            "move_id": str(uuid.uuid4()), 
            "tid": TENANT_ID, 
            "cid": olympus_id
        })
        
        # Actualizar tabla de balances (Balance actual: -700 -> -660)
        conn.execute(text("""
            UPDATE customer_balances 
            SET balance = balance + 40 
            WHERE customer_id = :cid
        """), {"cid": olympus_id})
        print("- Ajuste de -$40 aplicado a Olympus Gym.")

        # 3. Revertir TEST de Uppn ($280) que inflaba el banner
        uppn_id = "d64a699c-bdff-4a3e-82bd-8a77307af6a2"
        # Borramos el último movimiento de Uppn de hoy ($280)
        conn.execute(text("""
            DELETE FROM inventory_movements 
            WHERE id IN (
                SELECT id FROM inventory_movements 
                WHERE customer_id = :cid AND total_amount = 280
                ORDER BY created_at DESC LIMIT 1
            )
        """), {"cid": uppn_id})
        
        # Restaurar balance de Uppn (-560 -> -280)
        conn.execute(text("""
            UPDATE customer_balances 
            SET balance = balance + 280
            WHERE customer_id = :cid
        """), {"cid": uppn_id})
        print("- Movimiento de prueba en Uppn eliminado y saldo restaurado.")

        conn.commit()
        print("--- RECONCILIACIÓN COMPLETADA CON ÉXITO ---")

if __name__ == "__main__":
    reconcile()

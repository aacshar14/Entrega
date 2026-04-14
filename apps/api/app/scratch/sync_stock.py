
from app.core.db import engine
from sqlalchemy import text

TENANT_ID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def sync_stock():
    with engine.connect() as conn:
        print("--- SINCRONIZANDO STOCK BALANCES CHOCÓBITOS ---")
        
        # 1. Obtener la suma neta de todos los movimientos por producto
        # (Entradas - Salidas)
        res = conn.execute(text("""
            SELECT product_id, SUM(quantity) as real_stock
            FROM inventory_movements
            WHERE tenant_id = :tid AND product_id IS NOT NULL
            GROUP BY product_id
        """), {"tid": TENANT_ID}).all()
        
        for row in res:
            p_id = row.product_id
            real_val = float(row.real_stock or 0.0)
            
            # 2. Forzar el valor en stock_balances
            conn.execute(text("""
                UPDATE stock_balances 
                SET quantity = :val, updated_at = NOW()
                WHERE product_id = :pid AND tenant_id = :tid
            """), {"val": real_val, "pid": p_id, "tid": TENANT_ID})
            print(f"- Producto {p_id}: Stock actualizado a {real_val}")

        conn.commit()
        print("--- SINCRONIZACIÓN COMPLETADA ---")

if __name__ == "__main__":
    sync_stock()

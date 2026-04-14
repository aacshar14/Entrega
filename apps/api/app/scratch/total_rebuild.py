
from app.core.db import engine
from sqlalchemy import text
import uuid

TENANT_ID = "923eae6a-8157-4995-96ff-0da24a82e9e1"
PRODUCTS = {
    "matcha": "e3b78ef7-1c15-4fc0-85c9-624930cb02d5",
    "chocochip": "d90080c6-cc9c-4379-a4ab-c6a66c995ecb",
    "brookie": "c27b6f28-a49d-4f76-b6cd-4b35b44711d1",
    "doble_chocolate": "b8969443-5433-429b-92e8-6be0dea08eda"
}
# TIERS ESTRICTOS: GYM=$35, NEGOCIO=$30, ESCUELA=$28
CUSTOMERS = {
    "Elotes MMP": {"id": "7d83087b-c128-4107-bfce-0a6ecedb7e78", "qty": 26, "price": 28, "matcha": 3, "choc": 5, "bro": 2, "dob": 8}, # Tier Mayoreo/Escuela?
    "Elotes MMR": {"id": "93d7fe46-1705-4a8f-ad98-7e3fb7ec450c", "qty": 15, "price": 28, "matcha": 3, "choc": 4, "bro": 4, "dob": 4},
    "Garden Ensaladas": {"id": "6b95f9f6-c82f-4f50-9607-87a7ce619cdd", "qty": 18, "price": 30, "matcha": 4, "choc": 5, "bro": 0, "dob": 9},
    "Olympus Gym": {"id": "89f43229-0b42-4b97-bfc9-be871c20cae3", "qty": 20, "price": 35, "matcha": 5, "choc": 5, "bro": 5, "dob": 5}, # ESPECIAL $35
    "Sin Escala": {"id": "067e8bfd-3357-452b-97c6-1a11c06988e9", "qty": 15, "price": 30, "matcha": 3, "choc": 4, "bro": 4, "dob": 4},
    "Súper Oscar": {"id": "5ed64099-7a73-43a1-b23a-a509ebbf0a60", "qty": 10, "price": 30, "matcha": 2, "choc": 3, "bro": 2, "dob": 3},
    "Tapioca": {"id": "75dc9fcc-3273-4661-888f-35be91b57067", "qty": 18, "price": 30, "matcha": 4, "choc": 5, "bro": 4, "dob": 5}
}

def rebuild_ledger():
    with engine.connect() as conn:
        print("--- RECONSTRUCCIÓN FINAL V5.9.6 (TIERS ESTRICTOS) ---")
        conn.execute(text("DELETE FROM inventory_movements WHERE tenant_id = :tid"), {"tid": TENANT_ID})
        conn.execute(text("DELETE FROM payments WHERE tenant_id = :tid"), {"tid": TENANT_ID})

        for sabor, p_id in PRODUCTS.items():
            conn.execute(text("""
                INSERT INTO inventory_movements (id, tenant_id, product_id, quantity, unit_price, total_amount, type, description, created_at, updated_at)
                VALUES (:mid, :tid, :pid, 50, 0, 0, 'production', :desc, '2026-04-08 09:00:00', '2026-04-08 09:00:00')
            """), {"mid": str(uuid.uuid4()), "tid": TENANT_ID, "pid": p_id, "desc": f"Producción {sabor}"})

        for name, data in CUSTOMERS.items():
            for flavor, p_id in [('matcha', PRODUCTS['matcha']), ('choc', PRODUCTS['chocochip']), ('bro', PRODUCTS.get('bro')), ('dob', PRODUCTS['doble_chocolate'])]:
                qty = data.get(flavor, 0)
                if qty > 0:
                    amount = qty * data['price']
                    conn.execute(text("""
                        INSERT INTO inventory_movements (id, tenant_id, customer_id, product_id, customer_name_snapshot, quantity, unit_price, total_amount, type, description, created_at, updated_at)
                        VALUES (:mid, :tid, :cid, :pid, :name, :qty, :up, :total, 'delivery', :desc, '2026-04-09 10:00:00', '2026-04-09 10:00:00')
                    """), {"mid": str(uuid.uuid4()), "tid": TENANT_ID, "cid": data['id'], "pid": p_id, "name": name, "qty": -qty, "up": data['price'], "total": amount, "desc": f"Entrega {flavor}"})
            
            qty_assigned = data.get('matcha', 0) + data.get('choc', 0) + data.get('bro', 0) + data.get('dob', 0)
            if data['qty'] > qty_assigned:
                extra = data['qty'] - qty_assigned
                amount = extra * data['price']
                conn.execute(text("""
                    INSERT INTO inventory_movements (id, tenant_id, customer_id, product_id, customer_name_snapshot, quantity, unit_price, total_amount, type, description, created_at, updated_at)
                    VALUES (:mid, :tid, :cid, :pid, :name, :qty, :up, :total, 'delivery', 'Extra', '2026-04-09 10:20:00', '2026-04-09 10:20:00')
                """), {"mid": str(uuid.uuid4()), "tid": TENANT_ID, "cid": data['id'], "pid": PRODUCTS['chocochip'], "name": name, "qty": -extra, "up": data['price'], "total": amount})
            
            if name == "Súper Oscar":
                conn.execute(text("""
                    INSERT INTO payments (id, tenant_id, customer_id, amount, method, created_at, updated_at)
                    VALUES (:pid, :tid, :cid, 300, 'cash', NOW(), NOW())
                """), {"pid": str(uuid.uuid4()), "tid": TENANT_ID, "cid": data['id']})

        conn.execute(text("""
            UPDATE customer_balances cb
            SET balance = (
                COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = cb.customer_id), 0) -
                COALESCE((SELECT SUM(total_amount) FROM inventory_movements WHERE customer_id = cb.customer_id), 0)
            )
            WHERE tenant_id = :tid
        """), {"tid": TENANT_ID})

        for p_id in PRODUCTS.values():
            real_val = conn.execute(text("SELECT SUM(quantity) FROM inventory_movements WHERE product_id = :pid"), {"pid": p_id}).scalar() or 0.0
            conn.execute(text("UPDATE stock_balances SET quantity = :val, last_updated = NOW() WHERE product_id = :pid AND tenant_id = :tid"), {"val": real_val, "pid": p_id, "tid": TENANT_ID})

        conn.commit()
        print("--- RECONSTRUCCIÓN FINALIZADA (STRICT TIERS) ---")

if __name__ == "__main__":
    rebuild_ledger()

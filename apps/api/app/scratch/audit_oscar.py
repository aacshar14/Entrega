
from app.core.db import engine
from sqlalchemy import text

OSCAR_ID = "5ed64099-7a73-43a1-b23a-a509ebbf0a60"

def verify_oscar():
    with engine.connect() as conn:
        res = conn.execute(text("""
            SELECT balance FROM customer_balances 
            WHERE customer_id = :cid
        """), {"cid": OSCAR_ID}).scalar()
        print(f"Saldo de Súper Oscar en DB: ${res}")
        
        # Auditoría de sus movimientos
        movs = conn.execute(text("""
            SELECT type, quantity, unit_price, total_amount, description 
            FROM inventory_movements 
            WHERE customer_id = :cid
        """), {"cid": OSCAR_ID}).all()
        
        print("\nMovimientos de Súper Oscar:")
        for m in movs:
            print(f"- {m.type} | Qty: {m.quantity} | Price: {m.unit_price} | Total: {m.total_amount} | {m.description}")

        # Auditoría de sus pagos
        pays = conn.execute(text("""
            SELECT amount, method, created_at FROM payments 
            WHERE customer_id = :cid
        """), {"cid": OSCAR_ID}).all()
        
        print("\nPagos de Súper Oscar:")
        for p in pays:
            print(f"- Amount: {p.amount} | Method: {p.method} | Date: {p.created_at}")

if __name__ == "__main__":
    verify_oscar()

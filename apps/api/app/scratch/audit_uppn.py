
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)
TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def audit():
    with engine.connect() as conn:
        print("--- AUDITING UPPN MOVEMENT (10 DOBLE CHOCO) ---")
        q = text("""
            SELECT m.id, m.type, m.quantity, m.unit_price, m.total_amount, m.customer_name_snapshot, p.name
            FROM inventory_movements m
            JOIN products p ON m.product_id = p.id
            WHERE m.tenant_id = :tid AND m.quantity = -10
            ORDER BY m.created_at DESC LIMIT 1
        """)
        m = conn.execute(q, {"tid": TID}).fetchone()
        if m:
            print(f"Movement Found: ID={m.id}, Qty={m.quantity}, Total={m.total_amount}, Cust={m.customer_name_snapshot}")
        else:
            print("Movement NOT found with quantity -10")

        print("\n--- CHECKING CUSTOMER BALANCE FOR UPPN ---")
        q_bal = text("""
            SELECT b.id, b.balance, c.name, b.tenant_id
            FROM customer_balances b
            JOIN customers c ON b.customer_id = c.id
            WHERE b.tenant_id = :tid AND c.name ~* 'UPPN'
        """)
        bal = conn.execute(q_bal, {"tid": TID}).fetchone()
        if bal:
            print(f"Balance Found: Name={bal.name}, Balance={bal.balance}, ID={bal.id}, TID_IN_DB={bal.tenant_id}")
        else:
            print("Balance NOT found for UPPN")

if __name__ == "__main__":
    audit()

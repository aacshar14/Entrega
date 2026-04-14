
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)
TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def sum_all():
    with engine.connect() as conn:
        print(f"--- MATHEMATICAL REALITY CHECK (Tenant: ChocoBites) ---")
        
        # 1. Sum of Negative Balances
        q_sum = text("""
            SELECT SUM(ABS(balance)) 
            FROM customer_balances 
            WHERE tenant_id = :tid AND balance < 0
        """)
        total = conn.execute(q_sum, {"tid": TID}).scalar()
        print(f"SUM OF ALL DEBTS (Balance < 0): ${total}")

        # 2. List of All Customers with negative balance
        q_list = text("""
            SELECT c.name, b.balance 
            FROM customer_balances b
            JOIN customers c ON b.customer_id = c.id
            WHERE b.tenant_id = :tid AND b.balance < 0
            ORDER BY b.balance ASC
        """)
        rows = conn.execute(q_list, {"tid": TID}).fetchall()
        print("\n--- INDIVIDUAL DEBTORS ---")
        for r in rows:
            print(f" - {r.name}: ${abs(r.balance)}")

if __name__ == "__main__":
    sum_all()


import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)
TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def deep_audit():
    with engine.connect() as conn:
        print(f"--- DEEP AUDIT: CUSTOMER BALANCES (CHOCOBITES) ---")
        q = text("""
            SELECT c.name, b.balance, c.active, c.id
            FROM customer_balances b
            JOIN customers c ON b.customer_id = c.id
            WHERE b.tenant_id = :tid AND b.balance < 0
            ORDER BY b.balance ASC
        """)
        results = conn.execute(q, {"tid": TID}).fetchall()
        grand_total = 0
        for r in results:
            debt = abs(r.balance)
            grand_total += debt
            print(f"Customer: {r.name} | Debt: ${debt} | Active: {r.active}")
        
        print(f"\nGRAND TOTAL DEBT (SUM OF ALL): ${grand_total}")
        
        print(f"\n--- PRODUCT CATALOG AUDIT ---")
        q_p = text("SELECT name, active FROM products WHERE tenant_id = :tid")
        prods = conn.execute(q_p, {"tid": TID}).fetchall()
        for p in prods:
            print(f"Product: {p.name} | Active: {p.active}")

if __name__ == "__main__":
    deep_audit()

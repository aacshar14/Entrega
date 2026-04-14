
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)
TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def find_40():
    with engine.connect() as conn:
        print("--- SEARCHING FOR $40 DEBTOR ---")
        q = text("""
            SELECT c.name, b.balance 
            FROM customer_balances b
            JOIN customers c ON b.customer_id = c.id
            WHERE b.tenant_id = :tid AND b.balance = -40
        """)
        res = conn.execute(q, {"tid": TID}).fetchall()
        for r in res:
            print(f"Found: {r.name} | Bal: {r.balance}")

if __name__ == "__main__":
    find_40()

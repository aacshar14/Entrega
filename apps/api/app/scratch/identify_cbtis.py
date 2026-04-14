
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)

def identify():
    with engine.connect() as conn:
        print("--- IDENTIFYING CBTIS 34 TENANT CONTEXT ---")
        q = text("""
            SELECT c.name, b.tenant_id as balance_tid, c.tenant_id as customer_tid, b.balance
            FROM customer_balances b
            JOIN customers c ON b.customer_id = c.id
            WHERE c.name ~* 'cbtis'
        """)
        results = conn.execute(q).fetchall()
        for r in results:
            print(f"Name: {r.name} | Bal_TID: {r.balance_tid} | Cust_TID: {r.customer_tid} | Bal: {r.balance}")

if __name__ == "__main__":
    identify()

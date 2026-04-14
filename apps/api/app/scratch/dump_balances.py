
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)
TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def dump_all_balances():
    with engine.connect() as conn:
        print(f"--- DUMPING ALL BALANCES FOR {TID} ---")
        q = text("""
            SELECT b.id, c.name, b.balance, b.customer_id
            FROM customer_balances b
            JOIN customers c ON b.customer_id = c.id
            WHERE b.tenant_id = :tid
        """)
        rows = conn.execute(q, {"tid": TID}).fetchall()
        total_neg = 0
        for r in rows:
            print(f"Customer: {r.name} | Balance: {r.balance} | ID: {r.id}")
            if r.balance < 0:
                total_neg += abs(r.balance)
        
        print(f"\nTOTAL NEGATIVE SUM IN THIS DUMP: ${total_neg}")

if __name__ == "__main__":
    dump_all_balances()

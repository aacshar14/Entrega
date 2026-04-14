
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)

def duplicates():
    with engine.connect() as conn:
        print("--- SEARCHING FOR DUPLICATE CUSTOMERS ---")
        q = text("SELECT id, name, tenant_id FROM customers WHERE name ~* 'cbtis'")
        res = conn.execute(q).fetchall()
        for r in res:
            print(f"ID: {r.id} | Name: {r.name} | TID: {r.tenant_id}")
        
        print("\n--- SEARCHING FOR CUSTOMER BALANCES ---")
        q_b = text("SELECT id, customer_id, balance, tenant_id FROM customer_balances WHERE tenant_id = '923eae6a-8157-4995-96ff-0da24a82e9e1'")
        res_b = conn.execute(q_b).fetchall()
        for rb in res_b:
             # get name
             name = conn.execute(text("SELECT name FROM customers WHERE id = :cid"), {"cid": rb.customer_id}).scalar()
             print(f"Name: {name} | Bal: {rb.balance} | CID: {rb.customer_id}")

if __name__ == "__main__":
    duplicates()

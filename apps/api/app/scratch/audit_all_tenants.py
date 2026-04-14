
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)

def audit_all_tenants():
    with engine.connect() as conn:
        print("--- GLOBAL TENANT AUDIT ---")
        q = text("""
            SELECT t.id, t.name, 
                   (SELECT COALESCE(SUM(ABS(balance)), 0) FROM customer_balances WHERE tenant_id = t.id AND balance < 0) as total_debt
            FROM tenants t
        """)
        results = conn.execute(q).fetchall()
        for r in results:
            print(f"Name: {r.name} | ID: {r.id} | Debt: ${r.total_debt}")

if __name__ == "__main__":
    audit_all_tenants()


import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)
TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def test_dashboard_sql():
    with engine.connect() as conn:
        print(f"--- TESTING DASHBOARD SQL FOR TID: {TID} ---")
        
        # Test Products Count (Banner that is also stale)
        q_prod = text("SELECT COUNT(id) FROM products WHERE tenant_id = :tid")
        res_prod = conn.execute(q_prod, {"tid": TID}).scalar()
        print(f"Products Count in DB: {res_prod}")

        # Test Debt Sum
        q_debt = text("""
            SELECT SUM(ABS(balance)) FROM customer_balances 
            WHERE tenant_id = :tid AND balance < 0
        """)
        res_debt = conn.execute(q_debt, {"tid": TID}).scalar()
        print(f"Total Debt Sum in DB: {res_debt}")

if __name__ == "__main__":
    test_dashboard_sql()

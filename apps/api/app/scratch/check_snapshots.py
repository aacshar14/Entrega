
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)
TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def check():
    with engine.connect() as conn:
        print("--- CHECKING SNAPSHOTS TABLE ---")
        q = text("""
            SELECT metric_name, metric_value, created_at 
            FROM metric_snapshots 
            WHERE tenant_id = :tid 
            ORDER BY created_at DESC 
            LIMIT 10
        """)
        results = conn.execute(q, {"tid": TID}).fetchall()
        for r in results:
            print(f"Name: {r.metric_name} | Value: {r.metric_value} | Date: {r.created_at}")

if __name__ == "__main__":
    check()

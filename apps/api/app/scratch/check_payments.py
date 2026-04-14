
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)
TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def check_payments():
    with engine.connect() as conn:
        q = text("SELECT SUM(amount) FROM payments WHERE tenant_id = :tid")
        total = conn.execute(q, {"tid": TID}).scalar()
        print(f"REAL PAYMENTS SUM: ${total}")

if __name__ == "__main__":
    check_payments()


import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)
TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"

def prod_count():
    with engine.connect() as conn:
        q = text("SELECT COUNT(id) FROM products WHERE tenant_id = :tid AND name != 'Birthday Cake'")
        count = conn.execute(q, {"tid": TID}).scalar()
        print(f"PRODUCT COUNT: {count}")
        
        q_list = text("SELECT name FROM products WHERE tenant_id = :tid AND name != 'Birthday Cake'")
        names = conn.execute(q_list, {"tid": TID}).fetchall()
        for n in names:
            print(f" - {n.name}")

if __name__ == "__main__":
    prod_count()

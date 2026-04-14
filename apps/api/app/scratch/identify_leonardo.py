
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)

def identify_user():
    with engine.connect() as conn:
        print("--- IDENTIFYING USER LEONARDO ---")
        q = text("""
            SELECT u.full_name, tu.tenant_id, t.name, u.email
            FROM users u
            JOIN tenant_users tu ON u.id = tu.user_id
            JOIN tenants t ON tu.tenant_id = t.id
            WHERE u.full_name ~* 'Leonardo' OR u.email ~* 'leonardo'
        """)
        results = conn.execute(q).fetchall()
        for r in results:
            print(f"Name: {r.full_name} | Email: {r.email} | TID: {r.tenant_id} | Tenant: {r.name}")

if __name__ == "__main__":
    identify_user()

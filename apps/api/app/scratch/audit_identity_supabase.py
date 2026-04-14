from sqlalchemy import text
from app.core.db import engine

def audit_final():
    print("--- CHRONOLOGICAL IDENTITY AUDIT ---")
    with engine.connect() as conn:
        print("\n[History: Last 10 Tenants Created]")
        res = conn.execute(text("SELECT id, name, slug, created_at FROM tenants ORDER BY created_at DESC LIMIT 10")).fetchall()
        for r in res:
            print(f"ID: {r[0]} | Name: {r[1]} | Slug: {r[2]} | Created: {r[3]}")
        
        print("\n[Count: Total Tenants]")
        count = conn.execute(text("SELECT COUNT(*) FROM tenants")).scalar()
        print(f"Total rows in tenants table: {count}")

if __name__ == "__main__":
    audit_final()

from sqlalchemy import text
from app.core.db import engine

def audit_schema_id():
    print("--- PRIMARY KEY AUDIT: tenants ---")
    with engine.connect() as conn:
        res = conn.execute(text("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'tenants' AND table_schema = 'public'
            AND column_name IN ('id', 'slug', 'name')
        """)).fetchall()
        for r in res:
            print(f"Col: {r[0]} | Type: {r[1]} | Default: {r[2]} | Null: {r[3]}")

if __name__ == "__main__":
    audit_schema_id()

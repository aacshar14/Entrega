import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Search for .env in current or apps/api
load_dotenv("apps/api/.env")
db_url = os.getenv("DATABASE_URL")

if not db_url:
    print("ERROR: DATABASE_URL not found in apps/api/.env")
    exit(1)

# Handle potential pgbouncer issue by ensuring we don't use pooling for this one-off
engine = create_engine(db_url)

query = text("""
SELECT u.id as user_id, u.email, tu.tenant_id, t.slug, tu.tenant_role, tu.is_active, tu.is_default
FROM users u
LEFT JOIN tenant_users tu ON u.id = tu.user_id
LEFT JOIN tenants t ON tu.tenant_id = t.id
WHERE u.email = 'test@entrega.space';
""")

try:
    with engine.connect() as conn:
        result = conn.execute(query)
        rows = result.fetchall()
        
        if not rows:
            print("USER_NOT_FOUND")
        else:
            print(f"FOUND {len(rows)} rows:")
            for row in rows:
                print(row)
except Exception as e:
    print(f"DATABASE_ERROR: {str(e)}")

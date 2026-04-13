import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("apps/api/.env")
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

user_id = '3f9802da-6146-4cc0-964e-1c22c1a3f6a6'
chocobites_id = '00000000-0000-0000-0000-000000000001'

with engine.connect() as conn:
    print(f"Restoring {chocobites_id} as default for {user_id}...")
    
    # 1. Clear all defaults for this user
    conn.execute(
        text("UPDATE tenant_users SET is_default = False WHERE user_id = :uid"),
        {"uid": user_id}
    )
    
    # 2. Set ChocoBites as default
    result = conn.execute(
        text("UPDATE tenant_users SET is_default = True WHERE user_id = :uid AND tenant_id = :tid"),
        {"uid": user_id, "tid": chocobites_id}
    )
    
    conn.commit()
    print(f"Updated {result.rowcount} rows. LEGACY_RECOVERY_COMPLETE")

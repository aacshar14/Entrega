
from app.core.db import engine
from sqlalchemy import text

print("Connecting to database...")
with engine.connect() as conn:
    print("Executing migrations...")
    try:
        conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS block_reason TEXT;"))
        conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS manually_overridden_by UUID;"))
        conn.execute(text("ALTER TABLE tenants ADD COLUMN IF NOT EXISTS manually_overridden_at TIMESTAMP WITH TIME ZONE;"))
        conn.commit()
        print("MIGRATION SUCCESSFUL: Table 'tenants' updated with billing control columns.")
    except Exception as e:
        print(f"MIGRATION FAILED: {str(e)}")

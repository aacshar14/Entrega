import uuid
from sqlalchemy import text
from app.core.db import engine
from app.core.logging import logger

OLD_ID = "00000000-0000-0000-0000-000000000001"
NEW_ID = str(uuid.uuid4())

TABLES = [
    "tenant_users",
    "tenant_whatsapp_integrations",
    "movements",
    "products",
    "customers",
    "balances",
    "orders",
    "metric_snapshots",
    "audit_logs",
    "onboarding_states",
    "inbound_events"
]

def migrate_identity():
    print(f"Starting Identity Migration: {OLD_ID} -> {NEW_ID}")
    
    with engine.begin() as conn:
        # 1. Check if tenant exists
        exists = conn.execute(text("SELECT id FROM tenants WHERE id = :id"), {"id": OLD_ID}).first()
        if not exists:
            print("ERROR: Phantom Tenant not found in DB.")
            return

        # 2. Disable Constraints (Temporal) - PostgreSQL Specific
        conn.execute(text("SET session_replication_role = 'replica';"))

        try:
            # 3. Migrate Foreign Keys in all known tables
            for table in TABLES:
                print(f"Migrating {table}...")
                conn.execute(
                    text(f"UPDATE {table} SET tenant_id = :new_id WHERE tenant_id = :old_id"),
                    {"new_id": NEW_ID, "old_id": OLD_ID}
                )

            # 4. Migrate Main PK
            print("Migrating Platform Registry Identity...")
            conn.execute(
                text("UPDATE tenants SET id = :new_id WHERE id = :old_id"),
                {"new_id": NEW_ID, "old_id": OLD_ID}
            )

            # 5. Commit is handled by engine.begin() context
            print(f"SUCCESS: ChocoBites migrated to {NEW_ID}")
            
        finally:
            # 6. Re-enable Constraints
            conn.execute(text("SET session_replication_role = 'origin';"))

if __name__ == "__main__":
    migrate_identity()

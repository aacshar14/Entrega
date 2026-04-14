import uuid
from sqlalchemy import text
from app.core.db import engine

OLD_ID = "00000000-0000-0000-0000-000000000001"
NEW_ID = str(uuid.uuid4())

def migrate_identity_robust():
    print(f"Starting ROBUST Identity Migration: {OLD_ID} -> {NEW_ID}")
    
    with engine.connect() as conn:
        # 1. Start manual transaction management
        trans = conn.begin()
        try:
            # 2. Find all tables with 'tenant_id'
            table_rows = conn.execute(text(
                "SELECT table_name FROM information_schema.columns WHERE column_name = 'tenant_id' AND table_schema = 'public'"
            )).fetchall()
            tables = [r[0] for r in table_rows]
            print(f"Detected tables: {tables}")

            # 3. Disable Constraints
            conn.execute(text("SET session_replication_role = 'replica';"))

            # 4. Migrate Foreign Keys
            for table in tables:
                if table == "tenants": continue # Update PK at the end
                print(f"Migrating {table}...")
                conn.execute(
                    text(f'UPDATE "{table}" SET tenant_id = :new_id WHERE tenant_id = :old_id'),
                    {"new_id": NEW_ID, "old_id": OLD_ID}
                )

            # 5. Migrate Main PK
            print("Migrating Platform Registry Identity...")
            conn.execute(
                text('UPDATE "tenants" SET id = :new_id WHERE id = :old_id'),
                {"new_id": NEW_ID, "old_id": OLD_ID}
            )

            # 6. Success -> Commit
            conn.execute(text("SET session_replication_role = 'origin';"))
            trans.commit()
            print(f"SUCCESS: ChocoBites migrated to {NEW_ID}")
            
        except Exception as e:
            # 7. Fail -> Rollback
            print(f"CRITICAL FAILURE: {str(e)}")
            trans.rollback()
            with engine.connect() as final_conn:
                final_conn.execute(text("SET session_replication_role = 'origin';"))

if __name__ == "__main__":
    migrate_identity_robust()

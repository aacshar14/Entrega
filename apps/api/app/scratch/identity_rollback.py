import uuid
from sqlalchemy import text
from app.core.db import engine

# REVERSING THE CHANGE: Back to Phantom ID
NEW_ID = "00000000-0000-0000-0000-000000000001"
OLD_ID = "93538905-3482-4cf5-9345-c4a932af1a1b" # The ID I just generated

def rollback_identity():
    print(f"REVERSING Identity Migration: {OLD_ID} -> {NEW_ID}")
    
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            table_rows = conn.execute(text(
                "SELECT table_name FROM information_schema.columns WHERE column_name = 'tenant_id' AND table_schema = 'public'"
            )).fetchall()
            tables = [r[0] for r in table_rows]

            conn.execute(text("SET session_replication_role = 'replica';"))

            for table in tables:
                if table == "tenants": continue
                print(f"Reverting {table}...")
                conn.execute(
                    text(f'UPDATE "{table}" SET tenant_id = :new_id WHERE tenant_id = :old_id'),
                    {"new_id": NEW_ID, "old_id": OLD_ID}
                )

            print("Reverting Platform Registry Identity...")
            conn.execute(
                text('UPDATE "tenants" SET id = :new_id WHERE id = :old_id'),
                {"new_id": NEW_ID, "old_id": OLD_ID}
            )

            conn.execute(text("SET session_replication_role = 'origin';"))
            trans.commit()
            print(f"ROLLBACK SUCCESS: ChocoBites restored to {NEW_ID}")
            
        except Exception as e:
            print(f"ROLLBACK FAILURE: {str(e)}")
            trans.rollback()
            with engine.connect() as final_conn:
                final_conn.execute(text("SET session_replication_role = 'origin';"))

if __name__ == "__main__":
    rollback_identity()

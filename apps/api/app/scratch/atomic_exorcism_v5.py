from sqlalchemy import text
from app.core.db import engine
import uuid

def atomic_purge_v5():
    print("--- ATOMIC IDENTITY EXORCISM V5: PREDICATE-GUARDED ---")
    
    with engine.connect() as conn:
        # 1. Verification Phase
        print("\n[Phase 1: Deterministic Lookup]")
        row = conn.execute(text("SELECT id, slug, name FROM tenants WHERE slug = 'chocobites'")).first()
        
        if not row:
            print("INFO: No tenant with slug 'chocobites' found. Verifying by ID...")
            row = conn.execute(text("SELECT id, slug, name FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001'")).first()
            if not row:
                print("VERIFIED: Phantom identity is already gone or does not exist.")
                return

        target_id = row[0]
        target_slug = row[1]
        target_name = row[2]
        print(f"IDENTITY IDENTIFIED: ID={target_id} | Slug={target_slug} | Name={target_name}")

        # 2. Execution Phase (Atomic & Predicate-Guarded)
        print(f"\n[Phase 2: Atomic Delete (Guard: ID={target_id} AND Slug={target_slug})]")
        trans = conn.begin()
        try:
            # Use direct SQL core to bypass ORM stale caches
            res = conn.execute(
                text("DELETE FROM tenants WHERE id = :oid AND slug = :oslug"),
                {"oid": target_id, "oslug": target_slug}
            )
            
            if res.rowcount > 0:
                print(f"ACTION: {res.rowcount} row(s) deleted successfully.")
                trans.commit()
                print("TX: COMMITTED")
            else:
                print("WARNING: Delete executed but rowcount was 0. Rollback.")
                trans.rollback()
                print("TX: ROLLBACK")
        except Exception as e:
            print(f"CRITICAL FAILURE: {str(e)}")
            trans.rollback()
            print("TX: ROLLBACK (Safety)")

        # 3. Final Verification
        print("\n[Phase 3: Final Verification]")
        check = conn.execute(text("SELECT id FROM tenants WHERE id = :oid"), {"oid": target_id}).first()
        if not check:
            print("RESULT: DELETION CONFIRMED. Identity purged.")
        else:
            print(f"RESULT: FAILED. Identity {target_id} still exists in table.")

if __name__ == "__main__":
    atomic_purge_v5()

from sqlalchemy import text
from app.core.db import engine

def orphan_audit():
    print("--- ORPHAN MEMBERSHIP AUDIT ---")
    
    with engine.connect() as conn:
        # 1. Search for memberships pointing to '0000'
        print("\n[Search: Memberships pointing to 0000...0001]")
        OLD_ID = "00000000-0000-0000-0000-000000000001"
        res = conn.execute(text("SELECT id, user_id, tenant_id FROM tenant_users WHERE tenant_id = :oid"), {"oid": OLD_ID}).fetchall()
        
        if not res:
            print("No memberships found for 0000...0001.")
        else:
            for r in res:
                print(f"Membership ID: {r[0]} | User ID: {r[1]} | Points to Ghost: {r[2]}")
                # EXORCISM: Purge these orphaned memberships or re-link them
                print(f"ACTION: PURGING membership {r[0]}...")
                conn.execute(text("DELETE FROM tenant_users WHERE id = :mid"), {"mid": r[0]})
                conn.commit()
                print("TX: COMMITTED PURGE.")

        # 2. General Orphans (Memberships pointing to non-existent tenants)
        print("\n[Audit: General Orphan Memberships]")
        res = conn.execute(text("""
            SELECT tu.id, tu.user_id, tu.tenant_id 
            FROM tenant_users tu
            LEFT JOIN tenants t ON tu.tenant_id = t.id
            WHERE t.id IS NULL
        """)).fetchall()
        
        for r in res:
            print(f"ORPHAN FOUND: MemberID={r[0]} | UserID={r[1]} | TargetTenantID={r[2]}")
            # print(f"ACTION: PURGING orphan {r[0]}...")
            # conn.execute(text("DELETE FROM tenant_users WHERE id = :mid"), {"mid": r[0]})
            # conn.commit()

if __name__ == "__main__":
    orphan_audit()

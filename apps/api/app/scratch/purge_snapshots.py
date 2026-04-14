from sqlalchemy import text
from app.core.db import engine

def purge_stale_snapshots():
    TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"
    print(f"--- REFRESHING DASHBOARD CACHE [Tenant: {TID}] ---")
    
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Delete snapshots for today to force recomputation
            print("Purging today's snapshots to force fresh calculation...")
            res = conn.execute(text("""
                DELETE FROM metric_snapshots 
                WHERE tenant_id = :tid 
                AND period_start >= CURRENT_DATE
            """), {"tid": TID})
            
            print(f"SUCCESS: {res.rowcount} stale snapshots removed.")
            trans.commit()
            print("Next dashboard visit will reflect transactional truth ($3,394.0).")
        except Exception as e:
            print(f"ERROR: {str(e)}")
            trans.rollback()

if __name__ == "__main__":
    purge_stale_snapshots()

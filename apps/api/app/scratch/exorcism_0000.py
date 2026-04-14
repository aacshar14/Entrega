from sqlalchemy import text
from app.core.db import engine

def perform_exorcism():
    print("--- IDENTITY EXORCISM: PURGING 0000...0001 ---")
    OLD_ID = "00000000-0000-0000-0000-000000000001"
    
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print(f"Attempting to delete tenant {OLD_ID}...")
            res = conn.execute(text("DELETE FROM tenants WHERE id = :oid"), {"oid": OLD_ID})
            
            if res.rowcount > 0:
                print(f"SUCCESS: Tenant {OLD_ID} permanently removed from database.")
                trans.commit()
            else:
                print(f"NOT FOUND: Tenant {OLD_ID} does not exist. (Wait, my audit saw it!)")
                trans.rollback()
        except Exception as e:
            print(f"FAILURE: Cannot delete tenant {OLD_ID}. Possible Foreign Key block.")
            print(f"Error Detail: {str(e)}")
            trans.rollback()

if __name__ == "__main__":
    perform_exorcism()

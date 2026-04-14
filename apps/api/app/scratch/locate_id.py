from sqlalchemy import text
from app.core.db import engine

def locate_real_id():
    print("--- LOCATING AUTHENTIC TENANT ID FOR CHOCOBITES MOVEMENTS ---")
    with engine.connect() as conn:
        # Search for any movement joined with a product named like 'Choco'
        res = conn.execute(text("""
            SELECT DISTINCT m.tenant_id, p.name 
            FROM inventory_movements m 
            JOIN products p ON m.product_id = p.id 
            WHERE p.name ILIKE '%Choco%' 
            LIMIT 10
        """)).fetchall()
        
        if not res:
            print("No movements found for products with 'Choco' in name.")
        else:
            for r in res:
                print(f"Data found under Tenant ID: {r[0]} | Product: {r[1]}")

if __name__ == "__main__":
    locate_real_id()

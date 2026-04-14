from sqlalchemy import text
from app.core.db import engine

def check_stock_sync():
    TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"
    print(f"--- STOCK SYNC AUDIT [Tenant: {TID}] ---")
    
    with engine.connect() as conn:
        # 1. Check Products for this tenant
        print("\n[Products Table]")
        prods = conn.execute(text("SELECT id, name FROM products WHERE tenant_id = :tid"), {"tid": TID}).fetchall()
        print(f"Total products: {len(prods)}")
        prod_ids = [str(p[0]) for p in prods]
        
        # 2. Check StockBalances for these products
        print("\n[StockBalances Table]")
        for pid in prod_ids:
            sb = conn.execute(text("SELECT id, tenant_id, quantity FROM stock_balances WHERE product_id = :pid"), {"pid": pid}).first()
            if sb:
                print(f"Product ID: {pid} | Balance TID: {sb[1]} | Qty: {sb[2]}")
            else:
                print(f"Product ID: {pid} | MISSING STOCK_BALANCE ROW")

if __name__ == "__main__":
    check_stock_sync()

from sqlalchemy import text
from app.core.db import engine

def inventory_audit():
    NEW_ID = "923eae6a-8157-4995-96ff-0da24a82e9e1"
    OLD_ID = "00000000-0000-0000-0000-000000000001"
    
    print(f"--- REAL INVENTORY AUDIT (ChocoBites) ---")
    
    with engine.connect() as conn:
        # 1. Physical Stock (StockBalance)
        print("\n[PHYSICAL STOCK (In Warehouse)]")
        res_new = conn.execute(text("SELECT SUM(quantity) FROM stock_balances WHERE tenant_id = :tid"), {"tid": NEW_ID}).scalar()
        res_old = conn.execute(text("SELECT SUM(quantity) FROM stock_balances WHERE tenant_id = :tid"), {"tid": OLD_ID}).scalar()
        print(f" -> Tenant NUEVO (923...): {res_new or 0.0} galletas")
        print(f" -> Tenant VIEJO (000...): {res_old or 0.0} galletas")

        # 2. Outside Stock (Deliveries not yet returned/paid)
        print("\n[OUTSIDE STOCK (With Customers)]")
        # SUM of delivery quantities (negative) * -1
        out_new = conn.execute(text("SELECT SUM(ABS(quantity)) FROM inventory_movements WHERE tenant_id = :tid AND type = 'delivery'"), {"tid": NEW_ID}).scalar()
        out_old = conn.execute(text("SELECT SUM(ABS(quantity)) FROM inventory_movements WHERE tenant_id = :tid AND type = 'delivery'"), {"tid": OLD_ID}).scalar()
        print(f" -> Con clientes (NUEVO): {out_new or 0.0} galletas")
        print(f" -> Con clientes (VIEJO): {out_old or 0.0} galletas")

        # 3. Weekly Movements (Since Monday April 7)
        print("\n[WEEKLY ACTIVITY (Since April 7)]")
        in_old = conn.execute(text("SELECT COUNT(*) FROM inventory_movements WHERE tenant_id = :tid AND type = 'adjustment' AND created_at >= '2026-04-07'"), {"tid": OLD_ID}).scalar()
        out_old_mov = conn.execute(text("SELECT COUNT(*) FROM inventory_movements WHERE tenant_id = :tid AND type = 'delivery' AND created_at >= '2026-04-07'"), {"tid": OLD_ID}).scalar()
        print(f" -> Incursiones VIEJO: {in_old} IN / {out_old_mov} OUT")

if __name__ == "__main__":
    inventory_audit()

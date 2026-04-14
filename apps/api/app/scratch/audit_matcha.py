
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DB_URL)

TID = "923eae6a-8157-4995-96ff-0da24a82e9e1" # ChocoBites

def audit():
    with engine.connect() as conn:
        print(f"--- DIAGNOSTIC: LAST MOVEMENTS FOR CHOCOBITES ---")
        
        # 1. Check movement content
        q = text("""
            SELECT m.id, m.type, m.quantity, m.unit_price, m.total_amount, m.customer_name_snapshot, p.name as product_name
            FROM inventory_movements m
            JOIN products p ON m.product_id = p.id
            WHERE m.tenant_id = :tid
            ORDER BY m.created_at DESC
            LIMIT 5
        """)
        results = conn.execute(q, {"tid": TID}).fetchall()
        for r in results:
            print(f"ID: {r.id} | Type: {r.type} | Qty: {r.quantity} | Price: {r.unit_price} | Total: {r.total_amount} | Product: {r.product_name} | Cust: {r.customer_name_snapshot}")

        # 2. Check Customer Balance for CBTIS 34
        print(f"\n--- CUSTOMER BALANCE: CBTIS 34 ---")
        q_cb = text("""
            SELECT b.balance, c.name, c.tier
            FROM customer_balances b
            JOIN customers c ON b.customer_id = c.id
            WHERE b.tenant_id = :tid AND c.name ~* 'cbtis'
        """)
        cb_res = conn.execute(q_cb, {"tid": TID}).fetchall()
        for r in cb_res:
            print(f"Name: {r.name} | Tier: {r.tier} | Balance: {r.balance}")

if __name__ == "__main__":
    audit()

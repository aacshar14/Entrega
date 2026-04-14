from sqlmodel import Session, select, func
from app.core.db import engine
from app.models.models import Tenant, InventoryMovement, User
from datetime import datetime, timezone
import json

def simulate_dashboard_response():
    TID = "923eae6a-8157-4995-96ff-0da24a82e9e1"
    print(f"--- SIMULATING DASHBOARD RESPONSE FOR {TID} ---")
    
    with Session(engine) as db:
        tenant = db.get(Tenant, TID)
        if not tenant:
            print("ERROR: Tenant not found in DB")
            return
            
        now_utc = datetime.now(timezone.utc)
        now_naive = now_utc.replace(tzinfo=None)
        month_start_naive = now_naive.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        t_id_str = str(tenant.id)

        # Replicating the EXACT dashboard logic
        produced_this_month = (
            db.exec(
                select(func.sum(InventoryMovement.quantity)).where(
                    InventoryMovement.tenant_id == t_id_str,
                    InventoryMovement.type == "adjustment",
                    InventoryMovement.quantity > 0,
                    InventoryMovement.created_at >= month_start_naive,
                )
            ).one()
            or 0.0
        )

        delivered_this_month = (
            db.exec(
                select(func.sum(InventoryMovement.quantity)).where(
                    InventoryMovement.tenant_id == t_id_str,
                    InventoryMovement.type == "delivery",
                    InventoryMovement.created_at >= month_start_naive,
                )
            ).one()
            or 0.0
        )

        response_stats = {
            "monthly_produced": float(produced_this_month),
            "monthly_delivered": abs(float(delivered_this_month)),
            "weekly_produced": float(produced_this_month),
            "weekly_delivered": abs(float(delivered_this_month)),
        }
        
        print("\n[MIGRATED JSON STATS]")
        print(json.dumps(response_stats, indent=2))

if __name__ == "__main__":
    simulate_dashboard_response()

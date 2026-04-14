
import requests
import uuid

# Configuration
API_URL = "https://entrega-api-734532675624.us-central1.run.app"
TOKEN = "V6_TOKEN_PLACEHOLDER" # I will need to get a token or use the internal DB session for test
# Actually, I'll use a local script that simulates the FastAPI dependency injection or just use Session.

from sqlmodel import Session, select
from app.core.db import engine
from app.api.v1.endpoints.movements import create_manual_movement, MovementManualCreate
from app.models.models import User, Tenant, Customer

TENANT_ID = "923eae6a-8157-4995-96ff-0da24a82e9e1"
USER_ID = "f8c64064-6820-4eda-9ae0-810ab85abdad" # Verified user for ChocoBites

with Session(engine) as session:
    tenant = session.get(Tenant, TENANT_ID)
    user = session.get(User, USER_ID)
    
    movement_data = MovementManualCreate(
        product_id="b8969443-5433-429b-92e8-6be0dea08eda",
        quantity=10,
        type="delivery",
        customer_id="d64a699c-bdff-4a3e-82bd-8a77307af6a2",
        description="TEST 1: UPPN Delivery Correction"
    )
    
    import asyncio
    async def run_test():
        try:
            res = await create_manual_movement(
                movement=movement_data,
                db=session,
                current_user=user,
                tenant=tenant
            )
            print(f"SUCCESS: Movement Created | ID: {res.id} | Total Amount: {res.total_amount}")
        except Exception as e:
            print(f"FAILED: {str(e)}")
            import traceback
            traceback.print_exc()

    asyncio.run(run_test())

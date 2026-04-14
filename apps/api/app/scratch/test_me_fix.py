
import asyncio
from sqlmodel import Session, select
from app.core.db import engine
from app.api.v1.endpoints.users import get_me
from app.models.models import User, TenantUser

USER_ID = "f8c64064-6820-4eda-9ae0-810ab85abdad" # Verified user

async def test_me():
    with Session(engine) as session:
        user = session.get(User, USER_ID)
        membership = session.exec(
            select(TenantUser).where(TenantUser.user_id == USER_ID, TenantUser.is_active == True)
        ).first()
        
        try:
            res = await get_me(current_user=user, active_membership=membership, db=session)
            print("SUCCESS: /me resolved correctly.")
            print(f"User: {res.user.email}")
            print(f"Active Tenant: {res.active_tenant.name if res.active_tenant else 'None'}")
            print(f"Billing Status: {res.active_tenant.billing.effective_status if res.active_tenant and res.active_tenant.billing else 'Unknown'}")
        except Exception as e:
            print(f"FAILED: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_me())

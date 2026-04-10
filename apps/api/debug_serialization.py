import os
import sys
import json
from sqlmodel import Session, create_engine, select
from pydantic import TypeAdapter

# Adjust path to include the app
sys.path.append(os.getcwd())

from app.models.models import User, Tenant, TenantWhatsAppIntegration, MeResponse
from app.api.v1.endpoints.users import get_tenant_info
from app.core.config import settings

def debug_serialization():
    engine = create_engine(settings.DATABASE_URL)
    db = Session(engine)

    print("Testing /api/v1/me Serialization...")

    # Mock an admin user
    user = db.exec(select(User).where(User.platform_role == "admin")).first()
    if not user:
        print("❌ No admin user found to test.")
        return

    # Build response logic (Minimal Version of get_me)
    tenants = db.exec(select(Tenant)).all()
    membership_infos = []
    for t in tenants:
        info = get_tenant_info(db, t)
        from app.models.models import MembershipInfo
        membership_infos.append(MembershipInfo(tenant=info, role="owner", is_default=False))

    response = MeResponse(
        user=user,
        active_tenant=membership_infos[0].tenant if membership_infos else None,
        memberships=membership_infos
    )

    try:
        # Try to serialize to JSON exactly like FastAPI does
        json_data = response.model_dump_json()
        print("✅ Serialization Successful!")
        # print(json_data[:200] + "...")
    except Exception as e:
        print(f"❌ Serialization FAILED: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_serialization()

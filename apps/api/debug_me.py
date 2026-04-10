import os
import sys
from sqlmodel import Session, create_engine, select

# Adjust path to include the app
sys.path.append(os.getcwd())

from app.models.models import User, Tenant, TenantWhatsAppIntegration, WhatsAppConfig
from app.api.v1.endpoints.users import get_tenant_info
from app.core.config import settings


def debug_me():
    engine = create_engine(settings.DATABASE_URL)
    db = Session(engine)

    print("Debugging /api/v1/me logic...")

    # 1. Test get_tenant_info for all tenants
    tenants = db.exec(select(Tenant)).all()
    print(f"Total Tenants: {len(tenants)}")

    for t in tenants:
        try:
            print(f"  Testing Tenant: {t.name} ({t.id})")
            info = get_tenant_info(db, t)
            print(f"    Success: status={info.whatsapp_status}")
        except Exception as e:
            print(f"    FAILED for {t.name}: {str(e)}")
            import traceback

            traceback.print_exc()


if __name__ == "__main__":
    debug_me()

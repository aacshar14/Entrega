import sys
import os
from sqlmodel import Session, select, create_engine, text

# Add current directory to path
sys.path.append(os.getcwd())

from app.core.config import settings
from app.models.models import User, Tenant, TenantUser


def fix():
    print(f"Connecting to: {settings.DATABASE_URL.split('@')[-1]}")
    engine = create_engine(settings.DATABASE_URL)

    with Session(engine) as session:
        # 1. Update test user Auth ID
        supabase_uid = "4b2fe84b-f3fe-4131-999c-8b84168f7891"
        user = session.exec(
            select(User).where(User.email == "test@entrega.space")
        ).first()
        if user:
            print(f"Updating user {user.email}: auth_provider_id={supabase_uid}")
            user.auth_provider_id = supabase_uid
            session.add(user)
        else:
            print("User test@entrega.space not found")

        # 2. Ensure linkage to chocobites
        tenant = session.exec(select(Tenant).where(Tenant.slug == "chocobites")).first()
        if tenant and user:
            print(f"Checking link for {user.email} in tenant {tenant.slug}")
            membership = session.exec(
                select(TenantUser).where(
                    TenantUser.tenant_id == tenant.id, TenantUser.user_id == user.id
                )
            ).first()
            if not membership:
                print("Creating membership link...")
                from uuid import uuid4

                membership = TenantUser(
                    id=uuid4(),
                    tenant_id=tenant.id,
                    user_id=user.id,
                    tenant_role="owner",
                    is_active=True,
                    is_default=True,
                )
                session.add(membership)
            else:
                print("Membership already exists.")
                membership.tenant_role = "owner"  # Ensure it's owner for testing
                session.add(membership)

        session.commit()
        print("FIX APPLIED")


if __name__ == "__main__":
    fix()

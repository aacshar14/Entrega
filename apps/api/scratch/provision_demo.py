import sys
import os
from sqlmodel import Session, select
from uuid import uuid4

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import engine
from app.models.models import User, Tenant, TenantUser


def provision_demo():
    with Session(engine) as session:
        email = "hgsadepe@gmail.com"
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            print("Creating user...")
            user = User(
                email=email,
                full_name="Hugo Gonzalez",
                is_active=True,
                auth_provider_id=str(uuid4()),  # Placeholder until they login
            )
            session.add(user)
            session.commit()
            session.refresh(user)

        # Check if tenant already exists
        tenant = session.exec(
            select(Tenant).where(Tenant.slug == "aguachiles-demo-final")
        ).first()
        if not tenant:
            print("Creating tenant...")
            tenant = Tenant(
                name="Aguachiles Demo",
                slug="aguachiles-demo-final",
                status="active",
                plan_code="premium_monthly",
                billing_status="active",
            )
            session.add(tenant)
            session.commit()
            session.refresh(tenant)

        # Create membership
        membership = session.exec(
            select(TenantUser).where(
                TenantUser.user_id == user.id, TenantUser.tenant_id == tenant.id
            )
        ).first()
        if not membership:
            print("Creating membership...")
            membership = TenantUser(
                tenant_id=tenant.id,
                user_id=user.id,
                tenant_role="owner",
                is_active=True,
                is_default=True,
            )
            session.add(membership)
            session.commit()

        print(f"PROVISIONING SUCCESSFUL: User {user.id}, Tenant {tenant.id}")


if __name__ == "__main__":
    provision_demo()

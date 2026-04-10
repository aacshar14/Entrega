import sys
import os
from sqlmodel import Session, select, create_engine, text

# Add current directory to path
sys.path.append(os.getcwd())

from app.core.config import settings
from app.models.models import User, Tenant, TenantUser


def ensure_entrega():
    print(f"Connecting to: {settings.DATABASE_URL.split('@')[-1]}")
    engine = create_engine(settings.DATABASE_URL)

    with Session(engine) as session:
        # 1. Ensure 'entrega' tenant exists
        statement = select(Tenant).where(Tenant.slug == "entrega")
        entrega = session.exec(statement).first()
        if not entrega:
            print("Creating 'Entrega' platform tenant...")
            from uuid import uuid4

            entrega = Tenant(
                id=uuid4(), name="EntréGA Platform", slug="entrega", status="active"
            )
            session.add(entrega)
            session.commit()
            session.refresh(entrega)
            print(f"Created Entrega Tenant: {entrega.id}")
        else:
            print(f"Entrega Tenant already exists: {entrega.id}")

        # 2. Ensure platform admins are linked to it?
        # Usually admin role in 'users' table is enough, but a membership helps with context.
        # Let's check for admin users.
        admins = session.exec(select(User).where(User.platform_role == "admin")).all()
        for admin in admins:
            membership = session.exec(
                select(TenantUser).where(
                    TenantUser.tenant_id == entrega.id, TenantUser.user_id == admin.id
                )
            ).first()
            if not membership:
                print(f"Linking admin {admin.email} to Entrega tenant...")
                membership = TenantUser(
                    tenant_id=entrega.id,
                    user_id=admin.id,
                    tenant_role="owner",
                    is_active=True,
                    is_default=True,
                )
                session.add(membership)
                session.commit()

    print("DONE")


if __name__ == "__main__":
    ensure_entrega()

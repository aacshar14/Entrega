import sys
import os
from uuid import UUID, uuid4
from datetime import datetime, timezone

# Add current directory to path to import app modules
sys.path.append(os.getcwd())

from sqlmodel import Session, select, create_engine, SQLModel, text
from app.core.config import settings
from app.models.models import User, Tenant, TenantUser


def seed():
    # 🔒 Production Guard: NEVER run against non-local DBs without explicit override
    db_url = settings.DATABASE_URL
    if "localhost" not in db_url and "127.0.0.1" not in db_url:
        print("!!! PREVENTING PRODUCTION SEEDING !!!")
        print(f"Target: {db_url.split('@')[-1]}")
        confirm = os.getenv("FORCE_PRODUCTION_SEED", "false")
        if confirm.lower() != "true":
            print("Aborting. To force this, set FORCE_PRODUCTION_SEED=true")
            sys.exit(1)

    print(f"Connecting to: {db_url.split('@')[-1]}")
    engine = create_engine(db_url, echo=True)

    # 0. Ensure tables are created IN THE SAME SESSION
    print("Forcing table creation...")
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Check current search path
        path = session.exec(text("SHOW search_path")).first()
        print(f"Current search path: {path}")

        # 1. Tenant ChocoBites
        statement = select(Tenant).where(Tenant.slug == "chocobites")
        tenant = session.exec(statement).first()
        if not tenant:
            print("Creating ChocoBites Tenant...")
            tenant = Tenant(
                id=uuid4(), name="ChocoBites", slug="chocobites", status="active"
            )
            session.add(tenant)
        else:
            print("ChocoBites already exists.")

        # 2. Test User
        supabase_uid = "4b2fe84b-f3fe-4131-999c-8b84168f7891"
        statement = select(User).where(User.auth_provider_id == supabase_uid)
        user = session.exec(statement).first()
        if not user:
            print(f"Creating Test User ({supabase_uid})...")
            user = User(
                id=uuid4(),
                email="test@entrega.space",
                full_name="Test User",
                auth_provider_id=supabase_uid,
                platform_role="admin",
            )
            session.add(user)
        else:
            print("Test User already exists.")

        session.commit()
        session.refresh(tenant)
        session.refresh(user)

        # 3. Membership
        statement = select(TenantUser).where(
            TenantUser.tenant_id == tenant.id, TenantUser.user_id == user.id
        )
        membership = session.exec(statement).first()
        if not membership:
            print("Linking User to ChocoBites...")
            membership = TenantUser(
                id=uuid4(),
                tenant_id=tenant.id,
                user_id=user.id,
                tenant_role="owner",
                is_default=True,
            )
            session.add(membership)
            session.commit()
            print("--- SEED COMPLETE ---")
        else:
            print("Membership already exists.")


if __name__ == "__main__":
    seed()

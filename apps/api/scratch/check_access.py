import os
import sys
from uuid import UUID
from sqlmodel import Session, select

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import engine
from app.models.models import User, Tenant, TenantUser


def check_user(email):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            print(f"User {email} NOT FOUND in database.")
            return

        print(f"User: {user.email} (ID: {user.id})")
        print(f"Platform Role: {user.platform_role}")
        print(f"Is Active: {user.is_active}")

        memberships = session.exec(
            select(TenantUser).where(TenantUser.user_id == user.id)
        ).all()
        print(f"Found {len(memberships)} memberships:")
        for m in memberships:
            t = session.get(Tenant, m.tenant_id)
            print(
                f"  - Tenant: {t.name if t else 'MISSING'} (Active: {m.is_active}, Default: {m.is_default})"
            )


if __name__ == "__main__":
    check_user("admin@entrega.space")
    print("-" * 30)
    check_user("test@entrega.space")

import sys
import os
from sqlalchemy import text
from sqlmodel import Session, select

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import engine
from app.models.models import User, TenantUser, Tenant


def investigate():
    print("--- REGRESSION INVESTIGATION ---")
    with engine.connect() as conn:
        # 1. Check Schema
        for table in ["users", "tenant_users"]:
            res = conn.execute(
                text(
                    f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}' AND column_name = 'is_active'"
                )
            ).fetchone()
            print(f"Table '{table}' has 'is_active' column: {res is not None}")

        # 2. Check Data Distribution
        for table in ["users", "tenant_users"]:
            try:
                counts = conn.execute(
                    text(f"SELECT is_active, COUNT(*) FROM {table} GROUP BY is_active")
                ).fetchall()
                print(f"Distribution for '{table}': {counts}")
            except Exception as e:
                print(f"Error counting in '{table}': {e}")

        # 3. Specific Check for Tenant Users (Memberships)
        try:
            null_count = conn.execute(
                text("SELECT COUNT(*) FROM tenant_users WHERE is_active IS NULL")
            ).scalar()
            print(f"TenantUsers with NULL is_active: {null_count}")
        except Exception as e:
            print(f"Error checking NULLs: {e}")

    # 4. Simulate /me logic failure
    with Session(engine) as session:
        first_user = session.exec(select(User)).first()
        if first_user:
            print(f"Simulating for user: {first_user.email}")
            try:
                memberships = session.exec(
                    select(TenantUser).where(
                        TenantUser.user_id == first_user.id,
                        TenantUser.is_active == True,
                    )
                ).all()
                print(f"Found {len(memberships)} active memberships for user.")
            except Exception as e:
                print(f"CRASH SIMULATED: {e}")


if __name__ == "__main__":
    investigate()

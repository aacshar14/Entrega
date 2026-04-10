from sqlalchemy import create_engine, text
from app.core.config import settings


def list_users():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        print("--- DATABASE USERS ---")
        users = conn.execute(
            text("SELECT email, auth_provider_id, platform_role FROM users;")
        ).fetchall()
        for u in users:
            print(f"Email: {u[0]} | AuthID: {u[1]} | Role: {u[2]}")

        print("\n--- DATABASE TENANTS ---")
        tenants = conn.execute(text("SELECT name, slug FROM tenants;")).fetchall()
        for t in tenants:
            print(f"Tenant: {t[0]} | Slug: {t[1]}")

        print("\n--- MEMBERSHIPS ---")
        members = conn.execute(
            text("SELECT user_id, tenant_id, tenant_role FROM tenant_users;")
        ).fetchall()
        for m in members:
            print(f"User: {m[0]} | Tenant: {m[1]} | Role: {m[2]}")


if __name__ == "__main__":
    list_users()

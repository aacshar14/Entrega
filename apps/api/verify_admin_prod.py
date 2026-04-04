import os
from sqlmodel import Session, create_engine, select
from app.models.models import User, Tenant

# Production Database URL
DATABASE_URL = os.getenv("DATABASE_URL")

def check_admin():
    if not DATABASE_URL:
        print("DATABASE_URL not set")
        return

    engine = create_engine(DATABASE_URL)
    with Session(engine) as session:
        # Check admin
        admin = session.exec(select(User).where(User.email == "admin@entrega.space")).first()
        if admin:
            print(f"User FOUND: {admin.email}")
            print(f"Platform Role: {admin.platform_role}")
            print(f"AuthProvider ID: {admin.auth_provider_id}")
            
            if admin.platform_role != "admin":
                print("FIXING platform_role to 'admin'...")
                admin.platform_role = "admin"
                session.add(admin)
                session.commit()
                print("Role FIXED.")
        else:
            print("User NOT FOUND in local DB.")

        # Check tenants
        tenants = session.exec(select(Tenant)).all()
        print(f"Tenants in DB: {[t.slug for t in tenants]}")

if __name__ == "__main__":
    check_admin()

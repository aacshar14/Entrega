import sys
import os
from sqlmodel import Session, select, create_engine, text

# Add current directory to path
sys.path.append(os.getcwd())

from app.core.config import settings
from app.models.models import User, Tenant, TenantUser

def diag():
    print(f"Connecting to: {settings.DATABASE_URL.split('@')[-1]}")
    engine = create_engine(settings.DATABASE_URL)
    
    with Session(engine) as session:
        print("\n--- TENANTS ---")
        tenants = session.exec(select(Tenant)).all()
        for t in tenants:
            print(f"ID: {t.id} | Slug: {t.slug} | Name: {t.name}")
            
        print("\n--- USERS ---")
        users = session.exec(select(User)).all()
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Auth ID: {u.auth_provider_id}")
            
        print("\n--- TENANT_USERS ---")
        members = session.exec(select(TenantUser)).all()
        for m in members:
            u = session.get(User, m.user_id)
            t = session.get(Tenant, m.tenant_id)
            print(f"User: {u.email if u else 'N/A'} -> Tenant: {t.slug if t else 'N/A'} | Role: {m.tenant_role}")

if __name__ == "__main__":
    diag()

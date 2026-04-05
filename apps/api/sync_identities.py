from sqlmodel import Session, select, create_engine
from app.models.models import User, Tenant, TenantUser
from app.core.config import settings
import uuid

# Configuration
HUGO_EMAIL = "admin@entrega.space"
LEO_EMAIL = "leogonzalez@outlook.com"
TEST_ACCOUNT = "test@entrega.space"

TENANT_NAME = "ChocoBites"
TENANT_SLUG = "chocobites"

engine = create_engine(str(settings.DATABASE_URL))

def sync_platform_identities():
    with Session(engine) as db:
        # 1. Resolve Hugo (Platform Admin)
        hugo = db.exec(select(User).where(User.email == HUGO_EMAIL)).first()
        if not hugo:
            print(f"Creating Hugo ({HUGO_EMAIL})...")
            hugo = User(email=HUGO_EMAIL, full_name="Hugo (EntréGA Admin)", platform_role="admin")
            db.add(hugo)
        else:
            print(f"Updating Hugo ({HUGO_EMAIL}) to Admin...")
            hugo.platform_role = "admin"
            db.add(hugo)

        # 2. Resolve/Create ChocoBites Tenant
        tenant = db.exec(select(Tenant).where(Tenant.slug == TENANT_SLUG)).first()
        if not tenant:
            print(f"Creating Tenant {TENANT_NAME}...")
            tenant = Tenant(name=TENANT_NAME, slug=TENANT_SLUG, ready=True)
            db.add(tenant)
            db.flush()
        else:
            print(f"Found existing tenant {TENANT_NAME}.")

        # 3. Resolve/Link Leo (Owner)
        leo = db.exec(select(User).where(User.email == LEO_EMAIL)).first()
        if not leo:
            print(f"Creating Leo ({LEO_EMAIL})...")
            leo = User(email=LEO_EMAIL, full_name="Leo Gonzalez", platform_role="user")
            db.add(leo)
            db.flush()
        
        # Link Leo to ChocoBites as Owner
        m_leo = db.exec(select(TenantUser).where(TenantUser.user_id == leo.id, TenantUser.tenant_id == tenant.id)).first()
        if not m_leo:
            print(f"Assigning Leo as Owner of {TENANT_NAME}...")
            m_leo = TenantUser(user_id=leo.id, tenant_id=tenant.id, tenant_role="owner", is_active=True, is_default=True)
            db.add(m_leo)

        # 4. Resolve/Link Test Account
        test = db.exec(select(User).where(User.email == TEST_ACCOUNT)).first()
        if not test:
            print(f"Creating Test User ({TEST_ACCOUNT})...")
            test = User(email=TEST_ACCOUNT, full_name="Tester Choco", platform_role="user")
            db.add(test)
            db.flush()
        
        # Link Test User to ChocoBites as Operator
        m_test = db.exec(select(TenantUser).where(TenantUser.user_id == test.id, TenantUser.tenant_id == tenant.id)).first()
        if not m_test:
            print(f"Assigning Test User to {TENANT_NAME}...")
            m_test = TenantUser(user_id=test.id, tenant_id=tenant.id, tenant_role="operator", is_active=True)
            db.add(m_test)

        db.commit()
        print("PLATFORM SYNC COMPLETE.")

if __name__ == "__main__":
    sync_platform_identities()

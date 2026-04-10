from sqlalchemy import create_engine, text
from app.core.config import settings


def final_fix():
    print(f"Connecting to: {settings.DATABASE_URL.split('@')[-1]}")
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        print("Creating table: tenants...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tenants (
                id UUID PRIMARY KEY, 
                name TEXT NOT NULL, 
                slug TEXT UNIQUE NOT NULL, 
                status TEXT DEFAULT 'active'
            );
        """))

        print("Creating table: users...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY, 
                email TEXT UNIQUE NOT NULL, 
                full_name TEXT, 
                platform_role TEXT DEFAULT 'user', 
                auth_provider_id TEXT UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE
            );
        """))

        print("Creating table: tenant_users...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tenant_users (
                id UUID PRIMARY KEY, 
                tenant_id UUID REFERENCES tenants(id), 
                user_id UUID REFERENCES users(id), 
                tenant_role TEXT DEFAULT 'operator', 
                is_default BOOLEAN DEFAULT FALSE, 
                is_active BOOLEAN DEFAULT TRUE
            );
        """))

        conn.commit()
        print("Tables created successfully!")

        # SEEDING
        print("Seeding ChocoBites...")
        u_id = "4b2fe84b-f3fe-4131-999c-8b84168f7891"
        t_id = "075c9f92-46e6-495b-865f-4bf119bcece8"  # Random UUID for tenant

        # Insert Tenant
        conn.execute(
            text(
                f"INSERT INTO tenants (id, name, slug) VALUES ('{t_id}', 'ChocoBites', 'chocobites') ON CONFLICT (slug) DO NOTHING;"
            )
        )

        # Insert User
        conn.execute(
            text(
                f"INSERT INTO users (id, email, full_name, auth_provider_id) VALUES ('{u_id}', 'test@entrega.space', 'Test User', '{u_id}') ON CONFLICT (auth_provider_id) DO NOTHING;"
            )
        )

        # Insert Membership (linking to existing or newly created IDs)
        # We need the real IDs from the DB if they already exist
        t_real_id = conn.execute(
            text("SELECT id FROM tenants WHERE slug = 'chocobites';")
        ).scalar()
        u_real_id = conn.execute(
            text(f"SELECT id FROM users WHERE auth_provider_id = '{u_id}';")
        ).scalar()

        conn.execute(
            text(
                f"INSERT INTO tenant_users (id, tenant_id, user_id, tenant_role, is_default) VALUES ('{u_real_id}', '{t_real_id}', '{u_real_id}', 'owner', TRUE) ON CONFLICT (id) DO NOTHING;"
            )
        )

        conn.commit()
        print("--- SEEDING COMPLETE! ---")


if __name__ == "__main__":
    final_fix()

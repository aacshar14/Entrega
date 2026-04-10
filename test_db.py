import psycopg2
import os


def test():
    # Primary Check: Pooler connection
    print("Testing Pooler connection...")
    try:
        url = "postgresql://postgres.dynpljsdgpebrzvhmzlj:uScenOWklzKwOgyn@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
        conn = psycopg2.connect(url)
        print("✅ Pooler connection successful!")
        cur = conn.cursor()

        email = "test@entrega.space"
        print(f"\nChecking user: {email}")

        # 1. Fetch user id and auth_provider_id from public.users
        cur.execute("SELECT id, auth_provider_id FROM users WHERE email = %s", (email,))
        u = cur.fetchone()
        print(f"Public profile: {u}")

        if u:
            # 2. Check memberships in tenant_users
            cur.execute(
                "SELECT tenant_id, tenant_role, is_active FROM tenant_users WHERE user_id = %s",
                (u[0],),
            )
            m = cur.fetchall()
            print(f"Memberships found: {len(m)}")
            for member in m:
                print(f"- Tenant: {member[0]}, Role: {member[1]}, Active: {member[2]}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Diagnostic failed: {e}")


if __name__ == "__main__":
    test()

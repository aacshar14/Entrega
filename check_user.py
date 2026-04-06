import sys
import os

# Add apps/api to path
sys.path.append('c:/Entrega/apps/api')

from sqlalchemy import text
from app.core.db import engine

def check():
    email = 'leo@chocobites.mx'
    with engine.connect() as conn:
        # Check auth.users (direct SQL as it's a hidden schema)
        try:
            result = conn.execute(text(f"SELECT id, email, confirmed_at, last_sign_in_at FROM auth.users WHERE email = '{email}'"))
            user = result.fetchone()
            print(f"Auth user: {user}")
        except Exception as e:
            print(f"Error checking auth.users: {e}")

        # Check profiles
        try:
            result = conn.execute(text(f"SELECT id, full_name, role FROM profiles WHERE email = '{email}'"))
            profile = result.fetchone()
            print(f"Profile: {profile}")
        except Exception as e:
            # Maybe plural?
            try:
                result = conn.execute(text(f"SELECT id, full_name, role FROM profiles_v2 WHERE email = '{email}'"))
                profile = result.fetchone()
                print(f"Profile (v2): {profile}")
            except Exception as e2:
                print(f"Error checking profiles: {e} / {e2}")

if __name__ == "__main__":
    check()

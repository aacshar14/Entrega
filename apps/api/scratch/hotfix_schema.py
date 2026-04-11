import sys
import os
from sqlmodel import Session, text

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import engine


def apply_hotfix():
    with Session(engine) as session:
        try:
            print("Adding is_active to users...")
            session.execute(
                text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"
                )
            )
            session.execute(
                text("UPDATE users SET is_active = TRUE WHERE is_active IS NULL")
            )

            print("Adding is_active to tenant_users...")
            session.execute(
                text(
                    "ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"
                )
            )
            session.execute(
                text("UPDATE tenant_users SET is_active = TRUE WHERE is_active IS NULL")
            )

            session.commit()
            print("HOTFIX SUCCESSFUL")
        except Exception as e:
            session.rollback()
            print(f"HOTFIX FAILED: {e}")
            sys.exit(1)


if __name__ == "__main__":
    apply_hotfix()

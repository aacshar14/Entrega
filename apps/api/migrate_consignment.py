import sys
import os
from sqlalchemy import text
from sqlmodel import Session, create_engine

# Add app directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


def run_migration():
    engine = create_engine(settings.DATABASE_URL)

    with Session(engine) as session:
        print("Starting Database Migration for Consignment Features...")

        # 1. Add 'cost' to products if not exists
        try:
            session.execute(
                text(
                    "ALTER TABLE products ADD COLUMN IF NOT EXISTS cost FLOAT DEFAULT 0.0;"
                )
            )
            print("SUCCESS: Added 'cost' column to products table.")
        except Exception as e:
            print(f"INFO: Could not add 'cost' (might already exist): {e}")

        # 2. Add 'customer_name_snapshot' to inventory_movements if not exists
        try:
            session.execute(
                text(
                    "ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS customer_name_snapshot VARCHAR;"
                )
            )
            print(
                "SUCCESS: Added 'customer_name_snapshot' column to inventory_movements."
            )
        except Exception as e:
            print(
                f"INFO: Could not add 'customer_name_snapshot' (might already exist): {e}"
            )

        session.commit()
        print("Migration complete. Database is now in sync with new features.")


if __name__ == "__main__":
    run_migration()

import os
import sys
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import Session, select

# Adjust path to include the app
sys.path.append(os.getcwd())

from app.models.models import WhatsAppConfig, TenantWhatsAppIntegration, Tenant
from app.core.config import settings


def migrate():
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = Session(engine)

    print("Starting WhatsApp Model Migration...")

    # 1. Fetch all legacy configs
    legacy_configs = db.exec(select(WhatsAppConfig)).all()
    print(f"Found {len(legacy_configs)} legacy configurations.")

    for config in legacy_configs:
        print(f"Processing Tenant: {config.tenant_id}")

        # Check if already migrated
        existing = db.exec(
            select(TenantWhatsAppIntegration).where(
                TenantWhatsAppIntegration.tenant_id == config.tenant_id
            )
        ).first()

        if existing:
            # Overwrite only if empty or explicitly allowed (Safeguard)
            if not existing.access_token_encrypted:
                print(f"Incomplete integration found. Merging data...")
                existing.access_token_encrypted = config.encrypted_access_token
                existing.phone_number_id = config.meta_phone_number_id
                existing.waba_id = config.waba_id
                existing.display_phone_number = config.display_phone_number
                existing.business_name = config.whatsapp_business_account_name
                existing.status = (
                    "connected"
                    if config.meta_onboarding_status in ["verified", "authorized"]
                    else "pending"
                )
                existing.setup_completed = config.setup_completed
                db.add(existing)
            else:
                print(f"Tenant already has a modern integration. Skipping.")
        else:
            # Create New
            print(f"Creating new integration record...")
            new_integ = TenantWhatsAppIntegration(
                tenant_id=config.tenant_id,
                waba_id=config.waba_id,
                phone_number_id=config.meta_phone_number_id,
                access_token_encrypted=config.encrypted_access_token,
                display_phone_number=config.display_phone_number,
                business_name=config.whatsapp_business_account_name,
                status=(
                    "connected"
                    if config.meta_onboarding_status in ["verified", "authorized"]
                    else "pending"
                ),
                setup_completed=config.setup_completed,
                connected_at=config.connected_at,
                updated_at=config.updated_at,
            )
            db.add(new_integ)

    db.commit()
    print("Migration completed successfully.")


if __name__ == "__main__":
    migrate()

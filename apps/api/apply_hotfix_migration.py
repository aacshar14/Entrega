import os
import sys
from sqlalchemy import create_engine, text

# Adjust path to include the app
sys.path.append(os.getcwd())

from app.core.config import settings


def apply_hotfix_migration():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        print("Applying Hotfix Migration: Adding missing columns...")

        sql = """
        -- Add missing columns to tenant_whatsapp_integrations table for V1.4 Normalization
        ALTER TABLE tenant_whatsapp_integrations ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
        ALTER TABLE tenant_whatsapp_integrations ADD COLUMN IF NOT EXISTS display_phone_number TEXT;
        ALTER TABLE tenant_whatsapp_integrations ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

        -- Handle potential column rename from transition
        DO $$ 
        BEGIN 
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenant_whatsapp_integrations' AND column_name='encrypted_access_token') THEN
                ALTER TABLE tenant_whatsapp_integrations RENAME COLUMN encrypted_access_token TO access_token_encrypted;
            END IF;
        END $$;
        """

        conn.execute(text(sql))
        conn.commit()
        print("Migration completed successfully.")


if __name__ == "__main__":
    apply_hotfix_migration()

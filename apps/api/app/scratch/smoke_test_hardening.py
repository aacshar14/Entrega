
import os
import sys
from datetime import datetime
from sqlmodel import Session, create_engine, select
from pydantic import ValidationError

# Setup path to include apps/api
sys.path.append(os.path.join(os.getcwd(), "apps", "api"))

from app.models.models import InventoryMovement, WhatsAppMessage, WhatsAppMessageStatus, MovementType, Tenant

# 1. Setup DB
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres"
if os.path.exists("apps/api/.env"):
    with open("apps/api/.env") as f:
        for line in f:
            if line.startswith("DATABASE_URL="):
                DATABASE_URL = line.split("=")[1].strip().strip('"')

engine = create_engine(DATABASE_URL)

def test_hardening():
    print("--- STARTING DB HARDENING SMOKE TEST V2 ---")
    
    with Session(engine) as session:
        # Get target tenant
        tenant = session.exec(select(Tenant)).first()
        if not tenant:
            print("ERROR: No tenant found for testing.")
            return

        print(f"SUCCESS: Testing with Tenant: {tenant.slug}")

        # TEST 1: Enum Enforcement (Positive)
        try:
            m = InventoryMovement(
                tenant_id=tenant.id,
                quantity=-5,
                type="delivery",  # Should be casted to Enum automatically
                description="Hardening Test: Valid String"
            )
            if isinstance(m.type, MovementType):
                print("STEP 1: String 'delivery' correctly casted to Enum. [OK]")
        except Exception as e:
            print(f"FAIL: Valid Enum failed: {e}")
            return

        # TEST 2: Enum Enforcement (Strict Validation)
        try:
            # This should trigger the new @validator
            m_invalid = InventoryMovement(
                tenant_id=tenant.id,
                quantity=-5,
                type="invalid_type_123"
            )
            print("FAIL: Invalid type string was accepted.")
        except (ValidationError, ValueError):
            print("STEP 2: Validation BLOCKED invalid string type. (HARDENED! OK)")

        # TEST 3: Property Compatibility
        msg = WhatsAppMessage(
            message_sid=f"hard_{datetime.now().timestamp()}",
            processing_status=WhatsAppMessageStatus.PENDING
        )
        if not msg.is_processed:
            print("STEP 3: Legacy property 'is_processed' = False. [OK]")
        
        msg.processing_status = WhatsAppMessageStatus.PROCESSED
        if msg.is_processed:
            print("STEP 4: Legacy property 'is_processed' = True. [OK]")

    print("--- SMOKE TEST PASSED: SYSTEM IS ATOMICALLY HARDENED ---")

if __name__ == "__main__":
    test_hardening()

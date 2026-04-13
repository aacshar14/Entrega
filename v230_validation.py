import sys
import os
import json
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlmodel import Session, select, create_engine
from datetime import datetime, timezone

# Add current directory to path
sys.path.append(os.path.join(os.getcwd(), "apps", "api"))

from dotenv import load_dotenv
load_dotenv("apps/api/.env")

from app.main import app
from app.core.dependencies import get_current_user, get_db
from app.models.models import User, Tenant, TenantUser

# Setup Engine
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def get_test_db():
    with Session(engine) as session:
        yield session

def validate():
    client = TestClient(app)
    
    with Session(engine) as session:
        # 1. Setup Test User (Platform Role = user)
        # We find or create a test subject
        test_user = session.exec(select(User).where(User.email == "test@entrega.space")).first()
        if not test_user:
            print("Creating test user...")
            test_user = User(
                id=uuid4(),
                email="test@entrega.space",
                full_name="E2E Tester",
                platform_role="user",
                is_active=True
            )
            session.add(test_user)
            session.commit()
            session.refresh(test_user)

        print(f"TESTING AS: {test_user.email}")
        
        # Dependency Overrides
        app.dependency_overrides[get_current_user] = lambda: test_user
        app.dependency_overrides[get_db] = get_test_db

        results = {}

        # --- TEST 1: Atomic Creation ---
        print("\n[Test 1] Atomic Creation with Minimal Input")
        test_slug = f"test-biz-{uuid4().hex[:6]}"
        payload = {"name": "Test Business", "slug": test_slug}
        
        response = client.post("/api/v1/tenants", json=payload)
        results["creation"] = response.json()
        
        assert response.status_code == 200
        assert results["creation"]["onboarding_state"] == "created"
        assert results["creation"]["billing_status"] == "trial_active"
        assert results["creation"]["plan_code"] == "basic_monthly"
        print("PASS: Tenant created with explicit state and billing baseline")

        # --- TEST 2: Idempotency ---
        print("\n[Test 2] Idempotency Check (Duplicate Submit)")
        response_re = client.post("/api/v1/tenants", json=payload)
        assert response_re.status_code == 200
        assert response_re.json()["id"] == results["creation"]["id"]
        print("PASS: Duplicate request returned existing tenant (Idempotent)")

        # --- TEST 3: State Transition ---
        print("\n[Test 3] State Transition (Profile Completion)")
        patch_payload = {
            "timezone": "America/Mexico_City",
            "currency": "MXN"
        }
        # In /me, X-Tenant-Id is used. In /tenants/active, it's also header-based.
        response_patch = client.patch(
            "/api/v1/tenants/active", 
            json=patch_payload,
            headers={"X-Tenant-Id": results["creation"]["id"]}
        )
        results["transitioned"] = response_patch.json()
        assert results["transitioned"]["onboarding_state"] == "profile_completed"
        assert results["transitioned"]["onboarding_step"] == 2
        print("PASS: Transitioned to 'profile_completed' after patching context")

        # --- TEST 4: Bootstrap Resilience ---
        print("\n[Test 4] API Bootstrap (/me) Integrity")
        response_me = client.get(
            "/api/v1/me/",
            headers={"X-Tenant-Id": results["creation"]["id"]}
        )
        results["me_bootstrap"] = response_me.json()
        
        active_t = results["me_bootstrap"]["active_tenant"]
        assert active_t["id"] == results["creation"]["id"]
        assert active_t["onboarding_state"] == "profile_completed"
        assert active_t["billing_status"] == "trial_active"
        print("PASS: /me correctly reflects explicit state and billing baseline")

        # Save results evidence
        with open("v230_onboarding_evidence.json", "w") as f:
            json.dump(results, f, indent=2)
            
        print("\nEvidence captured in v230_onboarding_evidence.json")

if __name__ == "__main__":
    validate()

import sys
import os
import json
from uuid import UUID
from fastapi.testclient import TestClient
from dotenv import load_dotenv
from sqlmodel import Session, select, create_engine

# Add API directory to path
sys.path.append(os.path.join(os.getcwd(), "apps", "api"))

# Load environment
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
        # 1. Identify Test Subjects
        admin_user = session.exec(select(User).where(User.platform_role == "admin")).first()
        if not admin_user:
            print("ERROR: No admin user found")
            return
            
        print(f"VALIDATING AS: {admin_user.email} (ID: {admin_user.id})")
        
        # Identify a valid tenant for headers
        test_tenant = session.exec(select(Tenant)).first()
        tenant_id = str(test_tenant.id) if test_tenant else None
        
        # 2. Dependency Overrides
        app.dependency_overrides[get_current_user] = lambda: admin_user
        app.dependency_overrides[get_db] = get_test_db

        results = {}

        # --- SCENARIO 1: Platform Admin without Header ---
        print("\n[Scenario 1] Admin without header (Global Context)")
        response = client.get("/api/v1/me/")
        results["admin_no_header"] = response.json()
        print(f"Status: {response.status_code}")
        print(json.dumps(results["admin_no_header"], indent=2))

        # --- SCENARIO 2: Platform Admin with Header ---
        if tenant_id:
            print(f"\n[Scenario 2] Admin with X-Tenant-Id: {tenant_id}")
            response = client.get("/api/v1/me/", headers={"X-Tenant-Id": tenant_id})
            results["admin_with_header"] = response.json()
            print(f"Status: {response.status_code}")
            # print(json.dumps(results["admin_with_header"], indent=2))

        # --- SCENARIO 3: Invalid X-Tenant-Id (Format and Ownership) ---
        print("\n[Scenario 3] Invalid X-Tenant-Id (Random UUID)")
        random_uuid = "00000000-0000-0000-0000-000000000000"
        response = client.get("/api/v1/me/", headers={"X-Tenant-Id": random_uuid})
        results["invalid_uuid"] = {"status": response.status_code, "detail": response.json()}
        print(f"Status: {response.status_code} | Detail: {response.json()}")

        # --- SCENARIO 4: Regular User (Single & Multi-tenant) ---
        # Find a regular user
        reg_user = session.exec(select(User).where(User.platform_role == "user")).first()
        if reg_user:
            print(f"\n[Scenario 4] Regular User: {reg_user.email}")
            app.dependency_overrides[get_current_user] = lambda: reg_user
            response = client.get("/api/v1/me/")
            results["regular_user"] = response.json()
            print(f"Status: {response.status_code}")
            # print(json.dumps(results["regular_user"], indent=2))
        else:
            print("\n[Scenario 4] SKIPPED: No regular user found")

        # Save results to artifact for evidence
        with open("v220_api_evidence.json", "w") as f:
            json.dump(results, f, indent=2)
        print("\nEvidence captured in v220_api_evidence.json")

if __name__ == "__main__":
    validate()

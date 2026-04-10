# Zero-Downtime Migration Strategy: EntréGA Platform (V1.6)

This manifest outlines the formal release pattern for EntréGA to maintain 99.9% availability during database schema transitions.

## 1. The EMSC Lifecycle
Every schema change must follow these four distinct phases:

| Phase | Action | Purpose |
| :--- | :--- | :--- |
| **Expand** | Add new columns as **nullable** or with safe defaults. | Avoid breaking older code versions still running. |
| **Migrate** | Apply the `alembic upgrade head` via the CI pipeline. | Synchronize the physical database with the repository. |
| **Switch** | Deploy code that utilizes new fields with fallback logic. | Safely transition application logic to the new schema. |
| **Contract** | Remove legacy columns/tables in a separate, later release. | Cleanup only after the new version is verified stable. |

## 2. Hardened Coding Rules (Backward Compatibility)
To prevent `500 Internal Server Errors` during the "Switch" phase:

*   **Defensive Imports**: Always handle `NameError` or `ImportError` on high-risk experimental modules.
*   **Defensive Queries**: Wrap all integration-specific database lookups in `try-except`.
*   **Null-Safe Pydantic**: All new schema fields in `BaseModel` must be `Optional` until the "Contract" phase is complete.
*   **Safe Defaults**:
    *   `status`: Default to `"active"` or `"not_connected"`.
    *   `billing`: Default to `"trial"` with `None` dates.
    *   `currency/timezone`: Fallback to `"MXN"` / `"UTC"`.

## 3. Migration Infrastructure (Cloud Run Job)
We move away from running migrations inside the API startup (circular risk) to a dedicated **Cloud Run Job**.

### **Workflow:**
1.  **CI Build**: Containerize the API.
2.  **DB Migration**: Execute a one-off Cloud Run Job:
    *   `gcloud run jobs execute migrate-api --wait`
    *   This job runs `alembic upgrade head` in an isolated environment.
3.  **API Deploy**: Deploy the new service revision only after the Job succeeds.

## 4. Pipeline Logic (`deploy.yml`)
The CI/CD pipeline must enforce this order:
1. Build Artifacts
2. Lint & Syntax Check
3. Run DB Migration Job (Pre-deploy)
4. Deploy API Service
5. Hardened Smoke Test
6. Deploy Web Frontend

## 5. Rollback Strategy
If a "Switch" fails:
1.  Revert API code immediately to the previous revision.
2.  **Do NOT** downgrade the DB schema unless absolutely necessary (the "Expand" phase ensures old code works with the new schema).

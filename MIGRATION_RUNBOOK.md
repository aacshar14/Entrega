# Migration Recovery & Rollback Runbook (V2.4.0)

This document describes the procedures for handling failed database migrations in the EntréGA platform.

## 1. Failure Modes & Detection

The CI/CD pipeline is configured to **FAIL CLOSED**. A deployment will be blocked if:
- The migration job times out (e.g., > 10m).
- Database connectivity fails.
- Alembic revision mismatch is detected.
- An exception occurs during `upgrade head`.

Detection: Check GitHub Actions logs for `MIGRATION_FAILURE` or `DEPLOY_BLOCKED_DUE_TO_MIGRATION`.

## 2. Inspection

To inspect the current database state, look at the logs of the failed Cloud Run Job or run:
```bash
# In local dev with Production DB URL
export DATABASE_URL=...
cd apps/api
python -m alembic current
python -m alembic heads
```

## 3. Recovery Strategy

### Option A: Transient Failure (Timeout/Connectivity)
If the failure was due to a network timeout or Supabase pooler interruption:
1. Verify the current head in the DB (see Inspection).
2. If the DB actually reached the target head, simple **Re-run** the GH Action job.
3. If not reached, re-run the migration job. The script is idempotent.

### Option B: Migration Exception (Logic Error)
If the migration script itself failed (e.g., DDL error):
1. **Fix the code**: Correct the alembic version file locally.
2. **Push to main**: This triggers a new build and migration attempt.
3. The pipeline will remain blocked until the migration succeeds.

## 4. Rollback Strategy

**IMPORTANT**: Always prefer **Fix-Forward** over Rollback for schema changes in production.

If you MUST roll back the database schema:
1. Identify the previous stable revision: `git log apps/api/alembic/versions`.
2. Run downgrade locally or via a one-shot job:
   ```bash
   python -m alembic downgrade <previous_revision>
   ```
3. **Revert the Code**: Revert the commit in `main` that introduced the failing migration.
4. The pipeline will redeploy the previous stable API image.

## 5. Emergency Manual Intervention

If the CI/CD pipeline is stuck and preventing a critical fix:
1. Manually apply the migration to the DB using a local environment connected to production.
2. Ensure `alembic current` matches the `head` committed in `main`.
3. Re-run the GitHub Action. The script will detect `ALREADY_CURRENT` and proceed with the API deploy.

---
*End of Runbook*

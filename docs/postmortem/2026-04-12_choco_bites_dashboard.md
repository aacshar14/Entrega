# Post-Mortem: Dashboard Stabilization - ChocoBites (April 2026)

## Incident Overview
**Date:** 2026-04-12
**Status:** Resolved
**Summary:** The ChocoBites production dashboard failed for authorized owners (Leonardo/Test) while other platform modules (Inventory, Customers) remained operational.

## Root Cause Analysis (RCA)
1.  **Attribute Mismatches:** `dashboard.py` referenced incorrect ORM/model attributes (`StockBalance.balance` instead of `quantity` and `Payment.payment_method` instead of `method`).
2.  **Frontend Desynchronization:** The API response fields (`activity`, `stock`) did not match the expectations of the React component in `apps/web/app/dashboard/page.tsx`, causing "NaN" displays and empty activity lists.
3.  **Datetime Conflicts:** Non-reconciled collisions between offset-naive and offset-aware datetimes in database comparison logic caused intermittent 500 errors.

## Resolution (Phase V1.9.11 - V1.9.18)
- **Hardened Dependencies:** Wrapped `structlog` context binding and middleware in try/except blocks to prevent global crashes.
- **Full Attribute Audit (V1.9.14):** Synchronized all API fields with `models.py` definitions.
- **Frontend-API Sync (V1.9.15):** Renamed objects and keys to match the web dashboard interface precisely.
- **Dynamic Tier Pricing (V1.9.17):** Implemented logic to calculate delivery amounts based on Customer Pricing Tiers (Mayoreo, Menudeo, Especial).
- **Inventory Consistency (V1.9.18):** Adjusted "IN" logic to reflect positive stock adjustments and cleaned up test records (Birthday Cake).

## Prevention & Lessons Learned
- **Strict Mode Auditing:** Always verify model attributes against the source-of-truth `models.py` before deploying aggregate endpoints.
- **Datetime Standardization:** Enforce naive-UTC datetimes for all database query comparisons.
- **Diagnostic Mode:** Implement temporary diagnostic error handlers (traceback in JSON) when investigating production-only crashes.
- **Mock-Driven Testing:** Add regression tests for the dashboard response structure before major releases.

---
*Documented by Antigravity AI for EntréGA Platform Documentation.*

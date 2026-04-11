# EntréGA Platform Audit V2 - Hardening & Technical Debt Baseline

**Date**: 2026-04-11
**Status**: Level 2 Hardening Complete
**Focus**: WhatsApp Embedded Signup, Multi-Tenant Security, and Infrastructure Stability

---

## 1. COMPLETED MAJOR FIXES (V1.7 Baseline)

### A. WhatsApp Integration (Level 2 Hardened)
- **Asset Discovery**: Implemented server-side automated discovery of `waba_id`, `phone_number_id`, and `business_account_id`.
- **API Realignment**: All Meta Graph API calls unifed to `v22.0`.
- **Ambiguity Protection**: Added strict failsafe for multiple WABAs (`MULTIPLE_WABA_DETECTED`).
- **Collision Protection**: Enforced cross-tenant uniqueness on `phone_number_id` to prevent message routing leaks.
- **Persistence**: Switched to an atomic "Fetch-or-Create" pattern for `TenantWhatsAppIntegration`, removing 404/Null state risks in frontend callbacks.

### B. Database & Migrations
- **Linear Graph**: Resolved "multiple heads" issue in Alembic. Current canonical chain is verified.
- **Tenant Isolation**: Row-Level Security (RLS) enabled on all 40 indices (including audit, metrics, and billing).
- **Billing Controls**: Manual billing status (`trial`, `grace`, `active`) and grace-period defaults are in place.

### C. Infrastructure
- **Cloud Run Startup**: Fixed Pydantic v2 validation errors and import name collisions that caused health check failures.
- **Formatting**: Implemented project-wide `Black` (API) and `Prettier` (Web) formatting sweeps.

---

## 2. IDENTIFIED TECHNICAL DEBT

### A. Metadata & Logging (High Priority)
- **Issue**: `metadata_json` was a generic fallback. Although now restored in `integrations.py`, many older tables (e.g., `customers`, `products`) still have non-normalized metadata.
- **Risk**: Searchability of custom attributes is limited until we transition to JSONB indexing.

### B. Legacy Endpoints (Medium Priority)
- **Orphaned Paths**: `/api/v1/whatsapp_auth.py` still exists but is superseded by `/api/v1/integrations/whatsapp`.
- **Fragmentation**: `settings.py` and `configs.py` contain overlapping logic for configuration management.
- **Refactor Goal**: Consolidate all configuration under a unified `IntegrationsService`.

### C. Dashboard Aggregation (Medium Priority)
- **Performance**: Dashboard metrics (Week-over-week flow) currently rely on runtime aggregations.
- **Scalability**: For tenants with >10k movements, this will exceed the 10s Cloud Run request timeout.
- **Debt**: Need to implement materialized views or a `MetricSnapshots` worker.

### D. Frontend Layout (Low Priority)
- **Layout Complexity**: `layout.tsx` (15KB) is highly coupled with navigation, user context, and notification logic.
- **Refactor Goal**: Split into `NavProvider`, `Sidebar`, and `Header` sub-components for better maintainability.

---

## 3. BASELINE FOR NEXT STAGE (V2.0)

### 🚀 Milestone 1: Automated Asset Selection
- **Objective**: Instead of failing when multiple WABAs are found, provide a UI selection step.
- **Requirement**: Extend `WhatsAppCompleteRequest` to allow an optional `selected_waba_id`.

### 🔐 Milestone 2: Service-Role Token Scoping
- **Objective**: Move from standard user tokens to system-user access tokens if long-term offline messaging is needed.
- **Current**: Token expires if user changes password/settings in Meta.

### 📊 Milestone 3: Real-time Operational Telemetry
- **Objective**: Surface `onboarding_status` (failed/pending) in the Platform Admin dashboard to assist stuck users.
- **Requirement**: Expose `TerminalError` codes from `metadata_json` to admins.

### 📦 Milestone 4: Storage Normalization
- **Objective**: Move business media (receipts/logs) to Supabase Storage instead of local/container ephemeral space.

---

## 4. SECURITY & COMPLIANCE FOOTPRINT

| Control | Implementation | Status |
| :--- | :--- | :--- |
| **Tenant Isolation** | RLS / PG_SERVICE_ROLE | ✅ ACTIVE |
| **Token Safety** | AES-256 (Fernet) Encryption | ✅ ACTIVE |
| **App Domains** | Whitelisted (entrega.space) | ✅ ACTIVE |
| **Meta Compliance** | Embedded Signup Logic | ✅ READY |
| **Audit Logs** | Global `audit_logs` table | ⚠️ PARTIAL |

---

**AUDIT SUMMARY**: Platform is stable enough for pilot testing (ChocoBites). The "Manual Operations" fallback remains untouched, leaving the risk of a WhatsApp API outage decoupled from core platform functions.

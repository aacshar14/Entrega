PROMPT — STABILIZATION PHASE EntréGA V1.2 (PRODUCTION HARDENING)
🎯 OBJECTIVE

Implement a stabilization and hardening phase for EntréGA V1.2 focused on:

Data consistency (no stock corruption)
Security (no spoofed inputs)
Idempotent processing (no duplicates)
Async architecture (handle WhatsApp bursts)
Scalability preparation (current target ≤100 tenants, future-ready for 1,000+)

This is a DEPLOY-SAFE evolution, NOT a rewrite.

⚠️ NON-NEGOTIABLE RULES
DO NOT break current flows (ChocoBites must keep working)
DO NOT introduce heavy infra (keep GCP-native or lightweight)
ALL changes must be backward compatible
Use feature flags if needed
Follow 12-Factor App
🧱 SCOPE OF WORK

1. 🔐 WEBHOOK SECURITY (P0)
Problem

WhatsApp webhook signature validation is currently bypassed.

Required
Validate Meta signature using:
X-Hub-Signature-256
Use App Secret from env
Reject invalid requests (401)
Deliver

Middleware or dependency:

verify_meta_signature(request)

Config via ENV:

META_APP_SECRET=
2. 🔁 IDEMPOTENCY LAYER (P0)
Problem

Duplicate messages can create duplicated movements/payments.

Required
Extract message_id from WhatsApp payload
Create table:
processed_messages (
  id UUID PK,
  message_id TEXT UNIQUE,
  tenant_id UUID,
  processed_at TIMESTAMP
)
Before processing:
Check if exists → skip
If not → process + insert
Deliver
Idempotency service
Safe retry behavior
3. 🔒 STOCK CONSISTENCY (LOCKING) (P0)
Problem

Concurrent updates can corrupt inventory.

Required
Use DB-level locking:
SELECT * FROM stock_balance
WHERE tenant_id = X AND sku = Y
FOR UPDATE;

OR optimistic locking:

version column
Deliver
Refactored stock update service
Atomic transaction for:
movement creation
stock update
4. ⚙️ ASYNC PROCESSING (QUEUE) (P1)
Problem

Webhook directly hits DB → not scalable.

Required

Introduce async layer:

Webhook → Queue → Worker → DB
Options (prefer simple):
GCP Pub/Sub (preferred)
OR
Redis (if already available)
Flow
Webhook:
validate signature
validate idempotency
enqueue event
Worker:
consume event
process business logic
update DB
Deliver
Publisher (webhook)
Consumer (worker service)
Retry logic
Dead-letter strategy (basic)
5. 🧠 TENANT SECURITY HARDENING (P0)
Problem

Tenant resolution depends on X-Tenant-Id header.

Required
Validate tenant against JWT user membership
Reject mismatch
Rule:
tenant_id MUST come from:
JWT → membership → resolved tenant

NOT from raw headers.

Deliver

Secure dependency:

get_current_tenant(user)
6. 🧹 WHATSAPP CONFIG CONSOLIDATION (P1)
Problem

Duplicate tables:

TenantWhatsAppIntegration
WhatsAppConfig
Required
Merge into single source of truth:
tenant_integrations (
  tenant_id,
  provider = 'whatsapp',
  config JSONB
)
Deliver
Migration script
Refactored access layer
7. 📈 SCALABILITY PREP (IMPORTANT CONTEXT)
Current Target
≤100 tenants → OK with current DB
Future (100 → 1000 tenants)

Prepare system for:

DB connection pooling
Async processing (covered above)
Avoid tight coupling to Supabase
Required Changes
Introduce abstraction layer:
repository pattern
Avoid direct Supabase assumptions in logic
8. 🧾 OBSERVABILITY (MINIMUM)
Required
Structured logs (JSON)
Log events:
webhook received
message processed
errors
Add basic metrics:
processed messages count
failed messages
📦 EXPECTED OUTPUT

Return:

1. IMPLEMENTATION PLAN

(step-by-step tasks)

1. CODE CHANGES
New files
Modified files
Snippets ready to paste
2. DB MIGRATIONS

(SQL or Alembic)

1. ARCHITECTURE UPDATE (V1.2)

Before vs After diagram

1. DEPLOY PLAN
order of deployment
rollback plan
2. RISKS
what could break
mitigation
🧠 FINAL NOTE

This phase is about:

👉 Making EntréGA stable enough to sell to real customers

NOT about over-engineering.

# EntréGA Performance Suite

Production-safe performance and reliability gating suite for the EntréGA fast-scaling backend.

## Purpose
Simulates load and validates application boundaries under concurrency. The K6 scenarios assert that database invariants (stock logic limits, deadlocks) and SRE bounds (1% error rate max, Sub 1.5s reads) are respected throughout scaling thresholds.

## Requirements
- Install `k6`: https://k6.io/docs/get-started/installation/
- Valid staging tenant and user credentials.

## Environment Variables

| Variable | Purpose | Defaut |
| --- | --- | --- |
| `PERF_BASE_URL` | Cloud Run or Localhost endpoint | `https://api.entrega.space` |
| `PERF_API_TOKEN` | Bearer JWT generated from staging tenant | `` |
| `PERF_TENANT_ID` | Header restriction for multi-tenant requests | `` |
| `PERF_CUSTOMER_ID` | Used for safe-write scenarios (Movements/Payments) | `000000...` |
| `PERF_PRODUCT_ID` | Safely tracked Product UID for testing | `000000...` |
| `ALLOW_WRITES` | Run destructive write commands (`movements.js` / `payments.js`) | `false` |
| `PERF_WEBHOOK_SECRET`| Generate HMAC Signature for Meta security bounds | `` |
| `PERF_STRICT` | Enable strict assertions (fails if secret is missing) | `false` |
| `STRESS_MODE` | Set to 'hard' for aggressive scaling | `soft` |

## How to Run

1. **Smoke Test** (Validation of target endpoints and tokens):
   ```bash
   make perf-smoke
   ```
2. **Baseline** (Non-stressed typical dashboard traffic for P95 measurement):
   ```bash
   make perf-baseline
   ```
3. **Webhook Tsunami** (Test processing of background worker and queuing system):
   ```bash
   make perf-webhook
   ```
4. **Mixed Tiers** (Simulates live app. Requires valid payload limits and active backend):
   ```bash
   make perf-mixed
   ```

## Interpretation Guide
- `http_req_duration{type:read}`: Exceeding 1.5s usually hints that SQL Model dependencies (`dashboard.js`) are failing due to heavy un-indexed aggregations.
- `stock_conflict_rate`: Expected to rise mildly on high `ALLOW_WRITES=true` concurrency. If 100%, the DB is locked or transaction is aborting erroneously.
- If scenarios fail by HTTP 403, ensure your JWT limits correlate to `PERF_TENANT_ID`.
- Webhook tests will explicitly fail in strict mode if `PERF_WEBHOOK_SECRET` is unset, preventing silent bypasses in CI.

## Safety Notes
- Always run against STAGING / DEV. 
- Using `PERF_BASE_URL` on Production is strongly discouraged unless using a rigorously isolated mock tenant. Load scales rapidly.

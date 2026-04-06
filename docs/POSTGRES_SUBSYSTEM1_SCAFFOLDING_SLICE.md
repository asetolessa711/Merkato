# Subsystem #1 PostgreSQL Scaffolding Slice

## Purpose
Narrow migration scaffolding slice for purchase/order creation.

This slice adds:
- Prisma setup
- Dockerized Postgres harness
- Phase 1 mirror schema/models
- Feature-flagged Postgres mirror writer on order creation

This slice does **not** add:
- Read-path changes
- API contract changes
- Canonical datastore cutover
- Broad migration/backfill
- External ID behavior changes

## Scope boundaries
- MongoDB remains canonical for order creation.
- Postgres writes are mirror-only and feature-flag controlled.
- Mirror covers only the minimum order creation payload needed to validate schema viability.
- Supported runtime proof path for this slice is CI-only.

## Files added
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260405194000_init_order_mirror/migration.sql`
- `backend/prisma/migrations/migration_lock.toml`
- `backend/prisma/client.js`
- `backend/docker-compose.postgres.yml`
- `backend/services/orderPostgresMirror.js`
- `backend/scripts/postgres/checkOrderMirror.js`
- `backend/scripts/postgres/runtimeProofOrderMirror.js`
- `.github/workflows/pr-subsystem1-postgres-mirror-proof.yml`

## Files changed
- `backend/package.json`
- `backend/env.sample`
- `backend/routes/orderRoutes.js`

## Feature flag behavior (explicit)
- `ORDERS_PG_MIRROR_MODE=off` (default):
  - mirror write is disabled
- `ORDERS_PG_MIRROR_MODE=best_effort`:
  - order creation flow remains Mongo-canonical
  - after successful Mongo commit, backend attempts a Postgres mirror write
  - mirror failure is logged and does not change client response
- `ORDERS_PG_MIRROR_ENABLED=true` (legacy alias):
  - only used when `ORDERS_PG_MIRROR_MODE` is unset
  - maps to `best_effort`

Non-supported modes are treated as `off` with a warning.

## Phase 1 Prisma models
- `OrderMirror`
  - `mongoId` (unique external id mirror)
  - buyer/payment/status/currency/totals
  - `shippingAddressJson`, `deliveryOptionJson`
  - source timestamps
- `OrderVendorMirror`
  - per-vendor totals/commission/status
  - `invoiceMongoId`
- `OrderVendorItemMirror`
  - per-item product id, quantity, pricing/tax

## Harness commands
From `backend/`:
- `npm run pg:up`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm run prisma:migrate:dev`
- `npm run pg:runtime:proof:env-check`
- `npm run pg:mirror:check -- <mongoOrderId>`
- `npm run pg:runtime:proof`
- `npm run pg:down`

## Supported proof path
- Official runtime proof path: CI-only
- Workflow: `.github/workflows/pr-subsystem1-postgres-mirror-proof.yml`
- Job: `subsystem1-postgres-mirror-proof`
- Trigger: `pull_request` targeting `main` with changes under:
  - `backend/prisma/**`
  - `backend/services/orderPostgresMirror.js`
  - `backend/routes/orderRoutes.js`
  - `backend/docker-compose.postgres.yml`
  - `backend/scripts/postgres/**`
  - `backend/package.json`
  - `backend/package-lock.json`
  - `.github/workflows/pr-subsystem1-postgres-mirror-proof.yml`

Phase 1 closure is based on this CI path, not local execution.

## Focused validation plan
1. Start Postgres harness (`pg:up`) and validate Prisma schema (`prisma:validate`).
2. Generate Prisma client (`prisma:generate`) and run migration (`prisma:migrate:dev`).
3. Run backend order-creation flow with mirror mode `off` and confirm baseline response unchanged.
4. Run backend order-creation flow with mirror mode `best_effort`.
5. Use `pg:mirror:check` with returned Mongo order id and confirm mirrored row shape:
   - one `OrderMirror`
   - expected vendor count
   - expected item count
   - totals/status fields populated
6. Re-run existing Mongo-backed integration smoke for order creation to confirm no API/read-path regressions.
7. In CI, run `.github/workflows/pr-subsystem1-postgres-mirror-proof.yml` to prove:
  - Postgres harness starts from repository compose
  - runtime dependencies are reachable before application proof runs
  - mirror runs in `best_effort`
  - order creation response invariant remains unchanged
  - mirrored rows are written and validated

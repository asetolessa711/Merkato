Scope Lock — TRAN: Customer order-history serving-experiment readiness controls

Objective
Add fail-closed readiness controls for customer order-history migration progression while keeping Mongo as the only serving source in this slice.

NEW canonical path

- Introduce explicit customer order-history serving-experiment controls:
  - experiment gate state
  - kill-switch state
  - bounded readiness thresholds derived from runtime shadow telemetry
- Add deterministic readiness evaluation for customer history aliases (/api/orders/my-orders and /api/orders/my) that classifies blocked versus eligible based on:
  - mismatch class signals
  - coverage health
  - telemetry integrity
  - comparator/runtime error signals
  - latency guard thresholds
- Emit structured readiness-decision telemetry for both aliases with explicit blocked reasons and fail-closed markers.
- Add focused rollback-rehearsal checks proving immediate fallback intent under kill-switch and degraded/comparator-failure conditions.

LEGACY path still present

- Mongo-backed customer order-history remains the only serving source.
- Existing request and response behavior for customer history remains authoritative.
- No PostgreSQL-serving response path is enabled.

TRANSITIONAL bridge path, if any

- Consume existing runtime shadow verification outputs as readiness inputs only.
- Keep all readiness outcomes non-serving and evidence-only.
- Preserve fail-closed behavior: uncertainty, degradation, or comparator/runtime failure remains blocked-legacy-only.

Untouched surfaces

- No admin route work.
- No vendor or product migration work.
- No schema changes.
- No write-path or dual-write changes.
- No guest-order retrieval expansion in this slice unless already covered by existing customer parity/read contract evidence.
- No frontend contract expansion.
- No migration orchestration/backfill execution.

Hard boundaries

- Restrict changes to customer order-history readiness controls, decision telemetry, rollback rehearsal checks, and focused tests.
- No serving-path switch logic.
- No cutover behavior or PostgreSQL-serving routing fallback.
- Keep PR in Draft until focused evidence and CI are complete and green.
- Keep rollback-rehearsal proof scoped to focused runtime behavior checks only; no broader tooling or framework work.

Acceptance evidence required in PR

- Focused tests proving:
  - gate off => blocked-legacy-only
  - kill switch active => blocked-legacy-only
  - readiness blocked classes remain non-serving
  - comparator/runtime failure remains fail-closed
  - alias-consistent readiness classification for /my-orders and /my
  - rollback-rehearsal fallback behavior is explicit and immediate
- CI green with no schema changes and no write-path changes.
- Published readiness telemetry samples showing blocked reasons and rollback-rehearsal outcomes.

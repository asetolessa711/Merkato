Scope Lock — TRAN: Customer order-history serving-policy transition rehearsal

Objective
Execute a governed, reversible serving-policy transition rehearsal for customer order-history aliases only, producing decision-grade evidence for or against guarded policy promotion without broad cutover.

NEW canonical path

- Run a bounded, governed guarded-serving evidence window for GET /api/orders/my-orders and GET /api/orders/my under explicit experiment-gate enablement in the approved rehearsal environment only.
- Keep /my-orders and /my alias-consistent in contract, readiness classification, guarded serving decision policy, and fail-closed fallback semantics.
- Capture and publish per-alias readiness telemetry, parity telemetry, serving-decision telemetry, and fallback reason counts for the bounded rehearsal window.
- Require kill-switch rehearsal evidence proving immediate reversion to Mongo serving.
- Require comparator/runtime-failure rehearsal evidence proving immediate fail-closed fallback to Mongo serving.

LEGACY path still present

- Mongo remains default serving outside and inside the rehearsal window unless explicit guarded eligibility is satisfied.
- Any blocked or degraded signal forces blocked-legacy-only and Mongo serving.
- No permanent serving-default switch is introduced in this slice.

TRANSITIONAL bridge path, if any

- Use existing guarded serving and readiness controls only.
- Preserve fail-closed behavior and config/control-path rollback expectations.
- Keep alias behavior explicitly aligned between /my-orders and /my.

Untouched surfaces

- No direct cutover.
- No guest-order retrieval expansion.
- No schema changes.
- No write-path or dual-write changes.
- No backfill or migration orchestration.
- No scope expansion beyond covered customer order-history contract.
- No domain pivot outside Customer Order Visibility and History Migration Tranche.

Hard boundaries

- Restrict implementation to transition governance artifacts, control-path handling, observability evidence capture, and focused proof tests/checks for covered customer order-history aliases.
- Keep PR in Draft until focused evidence, CI, and governance approvals are complete.

Acceptance evidence required in PR

- Focused guarded-path tests are green for both aliases.
- Rehearsal evidence window shows explicit eligibility with no active blocked reasons for both aliases at go checkpoint.
- Kill-switch rehearsal demonstrates immediate Mongo revert behavior.
- Comparator/runtime-failure rehearsal demonstrates immediate fail-closed fallback to Mongo.
- Governance approvals are recorded before any serving-policy promotion decision.

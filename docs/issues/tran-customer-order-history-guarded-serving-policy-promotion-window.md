Scope Lock — TRAN: Customer order-history guarded serving-policy promotion window

Objective
Execute a real, bounded, reversible customer order-history serving-policy promotion window for covered aliases only, producing final go-or-hold evidence for guarded policy advancement.

In-scope surface
- Covered aliases only: GET /api/orders/my-orders and GET /api/orders/my.
- Covered customer-owned order-history contract only.
- Guarded serving-policy advancement evidence only.

TRANSITIONAL promotion path
- Enable the customer order-history experiment gate only in the approved promotion environment and only for the bounded promotion window with predeclared go-checkpoint thresholds.
- Keep alias-consistent decisioning and response behavior across /my-orders and /my.
- Record per-alias readiness eligibility, blocked-reason counts, serving-source decisions, parity status, comparator/runtime fallback events, and latency guard outcomes.
- Require explicit kill-switch rehearsal during the window proving immediate Mongo reversion.
- Require explicit comparator/runtime-failure rehearsal during the window proving immediate fail-closed fallback to Mongo.
- Produce a formal go-or-hold decision artifact with approvals tied to measured window evidence.

LEGACY path still present
- Mongo remains the default-safe source whenever readiness is blocked, degraded, or uncertain.
- Any no-go trigger immediately forces blocked-legacy-only posture.

TRANSITIONAL bridge path
- Use existing guarded-serving and readiness control paths only.
- No new serving algorithm, no new contract shape, and no schema evolution.
- Promotion remains bounded and reversible in this slice.

Out of scope
- No direct cutover.
- No guest-order retrieval expansion.
- No schema work.
- No write-path or dual-write work.
- No backfill or migration orchestration.
- No scope expansion outside covered customer order-history contract.
- No domain pivot outside Customer Order Visibility and History Migration Tranche.

Hard boundaries
- Restrict implementation to controlled policy-promotion execution, evidence capture, go-or-hold decisioning, and focused proofs for covered aliases.
- Keep PR in Draft until bounded-window evidence, CI checks, and governance approvals are complete.

Acceptance evidence required in PR
- Focused guarded-path tests remain green.
- Bounded window meets predeclared go-checkpoint thresholds for both aliases with no unresolved blocked reasons.
- No comparator/runtime failure fallback events at go checkpoint; otherwise decision is hold.
- Kill-switch rehearsal demonstrates immediate Mongo reversion.
- Comparator/runtime-failure rehearsal demonstrates immediate fail-closed fallback to Mongo.
- Explicit go-or-hold decision and approvals are recorded in-slice.

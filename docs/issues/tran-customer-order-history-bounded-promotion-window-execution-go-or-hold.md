Scope Lock — TRAN: Customer order-history bounded guarded serving-policy promotion-window execution and go-or-hold decision

Objective
Execute a real, bounded, reversible customer order-history guarded serving-policy promotion window for covered aliases only, and produce a formal go-or-hold decision artifact from measured window evidence.

In-scope surface
- Covered aliases only: GET /api/orders/my-orders and GET /api/orders/my.
- Covered authenticated customer-owned order-history contract only.
- Existing guarded-serving and readiness-control paths only.
- Evidence capture and governance decisioning for this bounded execution window only.

TRANSITIONAL execution path
- Enable the customer order-history experiment gate only in the approved promotion environment and only for a predeclared bounded evidence window.
- Keep alias-consistent decisioning and response behavior across /my-orders and /my for the full window.
- Record per-alias readiness eligibility, blocked-reason counts, serving-source decisions, parity status, comparator/runtime fallback events, and latency-guard outcomes.
- Execute explicit kill-switch rehearsal during the window and prove immediate reversion to Mongo serving.
- Execute explicit comparator/runtime-failure rehearsal during the window and prove immediate fail-closed fallback to Mongo serving.
- Produce a formal go-or-hold decision artifact with approvals tied to measured window evidence.

LEGACY path still present
- Mongo remains the default-safe source whenever readiness is blocked, degraded, uncertain, or outside the bounded window.
- Any no-go trigger immediately forces blocked-legacy-only posture and Mongo serving.

TRANSITIONAL bridge path
- No new serving algorithm.
- No new contract shape.
- No schema evolution.
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
- Restrict implementation to bounded execution controls, evidence capture, rehearsal proofs, and go-or-hold decisioning for covered aliases.
- Use existing guarded-serving and readiness-control mechanisms only; do not introduce new serving logic beyond bounded execution control needed to run the approved promotion window.
- Keep PR in Draft until bounded-window evidence, CI checks, and governance approvals are complete.

Acceptance evidence required in PR
- Focused guarded-path tests remain green.
- Bounded window meets predeclared go-checkpoint thresholds for both aliases with no unresolved blocked reasons.
- No comparator/runtime failure fallback events at go checkpoint; otherwise decision is hold.
- Kill-switch rehearsal demonstrates immediate Mongo reversion.
- Comparator/runtime-failure rehearsal demonstrates immediate fail-closed fallback to Mongo.
- Explicit go-or-hold decision and approvals are recorded in-slice.

Decision rule
- GO only if all acceptance evidence requirements are satisfied for both aliases at checkpoint.
- HOLD if any no-go condition appears, with immediate legacy-safe posture preserved.
- Any HOLD outcome leaves Mongo as the default serving posture after the bounded window.
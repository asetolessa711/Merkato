Scope Lock — TRAN: Guarded customer order-history serving-path experiment

Objective
Introduce a tightly guarded, fail-closed customer order-history serving-path experiment for customer history endpoints only, while preserving Mongo as default serving unless explicit guarded conditions are satisfied.

In-scope surface
- Customer order-history only.
- Alias-consistent behavior for /my-orders and /my.
- Covered customer history read contract only.

TRANSITIONAL guarded path
- Add guarded serving decision logic for customer order-history that may serve covered PostgreSQL responses only when all readiness controls are explicitly eligible.
- Keep fail-closed default behavior at all times.
- Require alias contract alignment, telemetry health, comparator health, coverage health, and latency guard compliance before any guarded PostgreSQL serving decision.
- Emit structured serving-decision telemetry and readiness telemetry for both aliases with explicit blocked reasons and decision source.

Guardrails and rollback behavior
- Mongo remains default serving source unless guarded eligibility is explicitly satisfied.
- Immediate rollback behavior is mandatory:
- Kill switch active must force blocked-legacy-only and immediate Mongo serving.
- Any comparator/runtime failure must force blocked-legacy-only and immediate Mongo serving.
- Any readiness degradation must force blocked-legacy-only and immediate Mongo serving.

Out of scope
- No guest-order retrieval expansion.
- No schema work.
- No write-path work.
- No dual-write expansion.
- No scope expansion outside covered customer history contract.
- No domain pivot outside Customer Order Visibility and History Migration Tranche.

Hard boundaries
- Restrict changes to guarded serving decisioning for customer order-history, rollback controls, and focused proofs only.
- No unrelated route changes.
- No admin or vendor tranche work.

Evidence-first acceptance requirements
- Focused tests proving:
- Gate off returns blocked-legacy-only and Mongo serves.
- Kill switch active returns blocked-legacy-only and Mongo serves immediately.
- Comparator/runtime failure is fail-closed and Mongo serves immediately.
- Alias-consistent guarded behavior for /my-orders and /my.
- Eligible guarded case serves covered PostgreSQL response only under explicit readiness eligibility.
- Any eligibility drift reverts immediately to Mongo serving.
- Focused command evidence and CI green required before transition out of Draft.

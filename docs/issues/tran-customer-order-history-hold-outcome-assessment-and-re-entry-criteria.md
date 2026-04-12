Scope Lock — TRAN: Customer order-history HOLD outcome assessment and re-entry criteria

Objective
Determine the exact cause class for the bounded promotion-window HOLD outcome and define explicit, auditable re-entry criteria for any future bounded-window rerun, while keeping Mongo as default posture unless and until those criteria are satisfied.

In-scope surface
- Covered aliases only: GET /api/orders/my-orders and GET /api/orders/my.
- Covered authenticated customer-owned order-history contract only.
- HOLD outcome assessment artifacts from the executed bounded window.
- Re-entry criteria definition only for a future bounded-window rerun.

TRANSITIONAL assessment path
- Assess and classify the HOLD outcome into exactly one primary class (and optional secondary class):
  - missing-approval-capture
  - insufficient-evidence-quality
  - low-traffic-or-confidence
  - real-runtime-concern
- Produce a cause map tying the class to concrete observed evidence (telemetry, rehearsal outcomes, decision records, and checkpoint state).
- Define explicit re-entry criteria per class, including required evidence artifacts, required approvals, and required confidence conditions.
- Define fail-closed re-entry gate: no future bounded-window rerun is permitted unless all declared re-entry criteria are satisfied and recorded.

LEGACY path still present
- Mongo remains the default-safe serving posture.
- Any unresolved HOLD cause or unmet re-entry criterion remains blocked-legacy-only.

Out of scope
- No direct cutover.
- No bounded-window rerun execution in this slice.
- No automatic rerun trigger in this slice.
- No guest-order retrieval expansion.
- No schema work.
- No write-path or dual-write work.
- No scope expansion outside covered customer order-history contract.
- No domain pivot outside Customer Order Visibility and History Migration Tranche.

Hard boundaries
- Restrict work to HOLD assessment, cause classification, and re-entry criteria definition.
- Do not introduce serving-policy promotion, serving-source expansion, or runtime cutover behavior.
- Keep PR in Draft until assessment evidence, focused checks, and governance approvals are complete.

Acceptance evidence required in PR
- Explicit HOLD cause classification recorded with evidence references.
- Explicit statement of whether HOLD was due to:
  - missing approval capture
  - insufficient evidence quality
  - low traffic/confidence
  - real runtime concern
- Explicit re-entry criteria checklist recorded for future bounded-window rerun.
- Explicit confirmation that Mongo default posture remains in force until criteria are satisfied.
- Governance approvals recorded for the assessment and re-entry criteria.

Decision rule
- Output of this slice is assessment-only: HOLD cause class plus re-entry criteria.
- No rerun, no promotion, and no cutover action is authorized by this slice.

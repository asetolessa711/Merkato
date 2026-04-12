Scope Lock — TRAN: Customer order-history final bounded rerun package and definitive GO-or-HOLD closure

Objective
Execute one final, bounded, reversible customer order-history rerun package that satisfies all re-entry criteria, captures decision-grade evidence, and produces a definitive GO-or-HOLD artifact for this lane.

Execution model
- This package executes as one slice.

Final-attempt rule
- This package is the last rerun attempt for this lane unless a truly new fact appears.
- If HOLD repeats after all re-entry criteria are satisfied, this lane stops and no further rerun cycle is opened.

In-scope surface
- Covered aliases only: GET /api/orders/my-orders and GET /api/orders/my.
- Covered authenticated customer-owned order-history contract only.
- One bounded rerun execution window with fixed metadata and pre-wired governance capture.
- Decision artifact generation for definitive GO-or-HOLD closure.

Required pre-wired controls before window start
- Approval capture packet is pre-created with named approvers and required signoff fields.
- Fixed window metadata is locked before start:
  - window start timestamp
  - window end timestamp
  - approved promotion environment identifier
- Explicit evidence sufficiency threshold is pre-declared and frozen before execution.

Mandatory execution artifacts
- Mandatory per-alias checkpoint packet for both /my-orders and /my including:
  - readiness eligibility state
  - blocked reasons
  - serving-source decision and reason
  - comparator/runtime fallback count
  - latency guard outcomes
- Mandatory kill-switch rehearsal artifact proving immediate fallback behavior.
- Mandatory comparator/runtime-failure rehearsal artifact proving fail-closed fallback behavior.
- Mandatory final GO-or-HOLD decision artifact with approvals and rationale.

Decision policy
- GO only if evidence sufficiency threshold is met and all required artifacts are complete for both aliases.
- HOLD if any required artifact is missing, ambiguous, or below threshold.
- No implicit GO. Lack of explicit approved GO artifact at window close is treated as HOLD.
- Any HOLD outcome preserves Mongo default posture.

No-loop rule
- If HOLD repeats after all re-entry criteria are satisfied, close this lane and do not open another rerun cycle.
- Further activity requires a truly new fact and separate governance approval.

Legacy posture
- Mongo remains default-safe posture unless and until GO is explicitly approved by this package.
- Any degradation, uncertainty, or checkpoint failure remains blocked-legacy-only.

Out of scope
- No direct cutover in this package.
- No guest-order retrieval expansion.
- No schema work.
- No write-path or dual-write work.
- No domain pivot outside Customer Order Visibility and History Migration Tranche.
- No repeated rerun cycle beyond this final attempt unless truly new fact appears.

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

## Recorded outcome for this slice

HOLD classification (recorded):

- Primary cause class: `missing-approval-capture`
- Secondary cause class: `insufficient-evidence-quality`
- Not classified as primary cause:
  - `low-traffic-or-confidence`
  - `real-runtime-concern`

Cause map with evidence:

- Evidence of missing explicit GO approval capture:
  - PASS record confirms guardrails and tests but does not include an explicit GO approval decision artifact:
    - https://github.com/asetolessa711/Merkato/issues/114#issuecomment-4231897128
  - Closure tuple confirms merge and verification, but does not assert a GO promotion decision artifact for bounded window outcome:
    - https://github.com/asetolessa711/Merkato/issues/114#issuecomment-4231946633
- Evidence of insufficient bounded-window decision evidence quality:
  - PASS record captures focused tests/CI and guardrail confirmations, but does not include decision-grade bounded-window runtime checkpoint artifacts (explicit checkpoint packet with approval, bounded-window outcome dossier):
    - https://github.com/asetolessa711/Merkato/issues/114#issuecomment-4231897128
  - Post-merge verification confirms test pass only; it is not a bounded-window GO checkpoint artifact:
    - https://github.com/asetolessa711/Merkato/issues/114#issuecomment-4231940734
- Evidence against real runtime concern as primary class in this slice:
  - Focused post-merge verification on `main` passed on both required suites:
    - https://github.com/asetolessa711/Merkato/issues/114#issuecomment-4231940734

Mongo posture decision (recorded):

- Mongo remains default-safe posture.
- Serving remains blocked-legacy-only unless and until re-entry criteria below are fully satisfied and approved.

## Re-entry criteria for any future bounded-window rerun

All criteria are mandatory before authorizing a future rerun slice:

1) Governance decision packet completeness
- Explicit GO-approval capture template pre-created in-slice with named approvers and required signoff fields.
- Explicit HOLD fallback statement preserved: no approval means Mongo-default posture.

2) Bounded-window evidence quality minimums
- Window start/end timestamps and approved promotion environment identifier recorded in-slice.
- Per-alias (`/my-orders`, `/my`) checkpoint packet recorded with:
  - readiness eligibility state
  - blocked reason inventory (if any)
  - serving-source decision and reason
  - comparator/runtime fallback event count
  - latency guard outcomes
- Kill-switch rehearsal evidence and comparator/runtime-failure rehearsal evidence attached as explicit artifacts.

3) Alias-consistency and contract safety gate
- Explicit alias-consistency proof for `/my-orders` and `/my` at rerun checkpoint.
- Any alias drift is automatic no-go for rerun progression.

4) Confidence and sufficiency gate
- Evidence quality must be decision-grade at checkpoint for both aliases.
- If evidence quality is incomplete or ambiguous at checkpoint, decision remains HOLD and Mongo default posture persists.

5) Fail-closed re-entry authorization gate
- Future rerun slice must declare and satisfy all above criteria before execution starts.
- Any missing criterion blocks rerun authorization and preserves blocked-legacy-only Mongo posture.

## Explicit boundaries reaffirmed

- No rerun execution in this slice.
- No direct cutover.
- No guest-order retrieval expansion.
- No schema work.
- No write-path work.
- No domain pivot.

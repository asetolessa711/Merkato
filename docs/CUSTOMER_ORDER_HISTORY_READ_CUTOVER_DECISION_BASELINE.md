# Customer Order-History Read-Cutover Decision Baseline

Status: governed decision baseline only (not a cutover slice)

Related scope lock:
- [docs/issues/tran-customer-order-history-read-cutover-decision-baseline.md](docs/issues/tran-customer-order-history-read-cutover-decision-baseline.md)

## Decision statement

Direct read cutover is not approved by this slice.

This baseline defines the covered customer order-history contract, summarizes tranche evidence achieved so far, documents explicit go/no-go and rollback criteria, and keeps Mongo as default serving unless a future separately governed slice is approved.

## 1) Covered customer order-history contract (eligible-for-consideration surface)

Only the contract below is in scope for any future serving-policy progression:

- Endpoints:
  - `GET /api/orders/my-orders`
  - `GET /api/orders/my` (alias; contract-equivalent behavior required)
- Scope:
  - authenticated customer-owned order history only
  - no guest-order retrieval expansion
- Ordering/window semantics:
  - deterministic ordering and stable covered window behavior for equivalent inputs
- Covered response semantics:
  - order identity linkage
  - buyer linkage
  - status
  - currency
  - payment method
  - totals (`total`, `totalAfterDiscount`, `discount`)
  - vendor/product summary fields required by covered history response path

Out-of-scope for eligibility in this baseline:

- any customer order behavior outside covered aliases and covered fields above
- guest retrieval expansion
- non-customer order-history surfaces
- write-path or schema evolution work

## 2) Achieved evidence inventory (customer tranche, already completed)

The following slices are accepted evidence inputs for this baseline:

- Runtime read-shadow and ownership contract baseline:
  - [docs/issues/tran-customer-order-history-runtime-read-shadow-ownership-baseline.md](docs/issues/tran-customer-order-history-runtime-read-shadow-ownership-baseline.md)
- Serving readiness controls (non-serving, fail-closed):
  - [docs/issues/tran-customer-order-history-serving-readiness-controls.md](docs/issues/tran-customer-order-history-serving-readiness-controls.md)
- Guarded serving-path experiment (eligibility-gated, fail-closed):
  - [docs/issues/tran-customer-order-history-guarded-serving-path-experiment.md](docs/issues/tran-customer-order-history-guarded-serving-path-experiment.md)

## 3) Explicit go / no-go criteria for any future serving-policy transition slice

### GO criteria (all required)

- Covered aliases `/my-orders` and `/my` remain contract-equivalent in decisioning and response expectations.
- Required checks are green for the candidate transition slice.
- Focused customer-history guarded-path tests are green.
- Readiness signals for covered aliases are explicitly eligible with no active blocked reasons in the transition evidence run.
- No comparator/runtime failure fallback events are present in transition evidence run for covered aliases.
- Kill-switch rehearsal evidence confirms immediate revert behavior to Mongo default serving.
- Governance approvals are recorded in the transition slice before any serving-policy promotion.

### NO-GO criteria (any one is sufficient)

- Alias drift or non-equivalent behavior between `/my-orders` and `/my`.
- Any unresolved blocked reason in readiness controls for covered aliases.
- Any comparator/runtime failure fallback in transition evidence run.
- Any coverage-gap or telemetry-health degradation signal unresolved at decision time.
- Any requirement for guest expansion, schema change, write-path change, or out-of-scope surface change.

## 4) Explicit rollback / kill-switch criteria for future transition slices

Future transition slices must enforce immediate fallback to Mongo default serving on any of the following:

- kill switch activation
- comparator/runtime failure
- readiness blocked state for covered aliases
- covered-window integrity failure (`missing-mirrored-window` or `covered-window-incomplete`)
- telemetry integrity degradation that invalidates covered decision confidence

Rollback mechanism expectation:

- config/control-path revert only (no schema/data migration action required)
- immediate legacy-safe behavior (`blocked-legacy-only` decision posture)

## 5) Alias-consistency requirements (`/my-orders` and `/my`)

The aliases must remain explicitly equivalent for customer order-history migration governance:

- same covered contract
- same readiness classification logic
- same guarded serving decision policy
- same fail-closed fallback semantics under degradation/failure

Any alias inconsistency is a no-go condition for transition progression.

## 6) Hard constraints for this baseline slice

This slice introduces governance and evidence criteria only.

Explicitly prohibited in this slice:

- runtime code changes
- serving cutover behavior
- guest expansion
- schema work
- write-path work
- scope expansion outside covered customer order-history contract

## 7) Result of this slice

Output decision:

- Not cutover-ready by default.
- Further serving-policy progression is permitted only through a future, separate governed slice that satisfies all go criteria and preserves rollback/kill-switch guarantees above.

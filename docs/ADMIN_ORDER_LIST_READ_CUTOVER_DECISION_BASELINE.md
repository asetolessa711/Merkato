# Admin Order-List Read-Cutover Decision Baseline

Status: governed decision baseline only (not a cutover slice)

Related scope lock:
- [docs/issues/new-admin-order-list-read-cutover-decision-baseline.md](docs/issues/new-admin-order-list-read-cutover-decision-baseline.md)

## Decision statement

Direct read cutover is not approved by this slice.

This baseline defines the exact covered admin order-list contract, summarizes the parity evidence already achieved, records unresolved uncertainty classes, and sets mandatory guardrails and rollback criteria for any future serving-path experiment slice.

## 1) Covered admin order-list contract (eligible-for-consideration surface)

Only the contract below is in scope for future cutover consideration:

- Filters:
  - `status`
  - `date-range` (`fromDate`/`toDate` and equivalent timestamp inputs)
- Ordering:
  - deterministic sort by created-time descending
  - deterministic tie-break by stable order identity
- Pagination:
  - `page` and `limit` window semantics
  - stable membership and boundaries for the same inputs
- Summary fields:
  - order identity linkage
  - buyer linkage
  - status
  - currency
  - payment method
  - totals (`total`, `totalAfterDiscount`, `discount`)
  - `vendorCount`
  - `itemCount`
  - `invoiceCount`

Out-of-scope for eligibility in this baseline:

- Any route or payload behavior outside the covered fields above
- Any customer/vendor list cutover behavior
- Any order-detail cutover behavior
- Any non-covered query dimensions

## 2) Achieved evidence inventory (already completed)

The slices below are accepted evidence inputs for this baseline:

- TRAN - runtime proof and verification:
  - [docs/issues/tran-order-mirror-runtime-proof-verification.md](docs/issues/tran-order-mirror-runtime-proof-verification.md)
- NEW - identity and external-ID foundations:
  - [docs/issues/new-identity-external-id-foundation.md](docs/issues/new-identity-external-id-foundation.md)
  - [docs/issues/new-product-vendor-foundation.md](docs/issues/new-product-vendor-foundation.md)
  - [docs/issues/new-order-invoice-external-id-foundation.md](docs/issues/new-order-invoice-external-id-foundation.md)
- TRAN - canonical identity propagation and completeness hardening:
  - [docs/issues/tran-order-mirror-canonical-identity-propagation.md](docs/issues/tran-order-mirror-canonical-identity-propagation.md)
  - [docs/issues/tran-order-mirror-canonical-buyer-identity-propagation.md](docs/issues/tran-order-mirror-canonical-buyer-identity-propagation.md)
  - [docs/issues/tran-order-mirror-canonical-order-invoice-identity-propagation.md](docs/issues/tran-order-mirror-canonical-order-invoice-identity-propagation.md)
  - [docs/issues/tran-order-mirror-canonical-identity-completeness-proof-hardening.md](docs/issues/tran-order-mirror-canonical-identity-completeness-proof-hardening.md)
- TRAN - read-shadow parity proofs:
  - [docs/issues/tran-order-mirror-read-shadow-parity-proof-order-detail.md](docs/issues/tran-order-mirror-read-shadow-parity-proof-order-detail.md)
  - [docs/issues/tran-order-mirror-read-shadow-parity-proof-customer-order-list-summary.md](docs/issues/tran-order-mirror-read-shadow-parity-proof-customer-order-list-summary.md)
  - [docs/issues/tran-order-mirror-read-shadow-parity-proof-vendor-order-list-summary.md](docs/issues/tran-order-mirror-read-shadow-parity-proof-vendor-order-list-summary.md)
  - [docs/issues/tran-order-mirror-read-shadow-parity-proof-admin-order-list-summary.md](docs/issues/tran-order-mirror-read-shadow-parity-proof-admin-order-list-summary.md)
  - [docs/issues/tran-order-mirror-read-shadow-parity-proof-admin-order-list-query-semantics.md](docs/issues/tran-order-mirror-read-shadow-parity-proof-admin-order-list-query-semantics.md)
- TRAN - runtime non-serving shadow verification:
  - [docs/issues/tran-order-mirror-runtime-read-shadow-verification-admin-order-list.md](docs/issues/tran-order-mirror-runtime-read-shadow-verification-admin-order-list.md)

## 3) Remaining gaps and uncertainty classes

This baseline records these unresolved classes as mandatory constraints for any future experiment:

- Contract-boundary uncertainty:
  - behavior outside covered filter/sort/pagination/summary contract is unproven for cutover
- Long-tail shape uncertainty:
  - rare production data distributions may not be fully represented by current evidence
- Dependency degradation uncertainty:
  - serving-path behavior under degraded Postgres or dependency contention is not yet validated in production-serving mode
- Sustained-operations uncertainty:
  - prolonged mismatch patterns, telemetry dropouts, and latency drift handling are not yet exercised in a serving-path experiment

## 4) Mandatory preconditions for any future serving-path experiment slice

No future experiment slice may proceed without all items below explicitly defined in-slice:

- Feature gating and kill switch:
  - explicit runtime gate controlling admin order-list serving source
  - immediate kill switch to revert to Mongo-serving path without redeploy dependency
- Observability minimums:
  - parity mismatch class counts
  - covered vs non-covered comparison counts
  - source/mirror/comparator latency distributions
  - telemetry health signal (drop or parse failure detection)
- Go/no-go criteria:
  - pre-declared mismatch tolerance policy for covered contract
  - pre-declared latency and error-budget thresholds
  - explicit hold/fail conditions before expansion
- Governance approval:
  - engineering owner approval
  - operations/reliability approval
  - migration governance approval captured in PR comments/checklist

## 5) Rollback criteria for any future serving-path experiment slice

Future experiment slices must include and enforce all rollback triggers below:

- Immediate rollback on covered-contract mismatch classes above declared tolerance
- Immediate rollback on latency regression beyond declared threshold window
- Immediate rollback on error-budget breach attributable to serving-path experiment
- Immediate rollback on coverage-gap growth or telemetry integrity failure
- Rollback mechanism expectation:
  - config-level revert to Mongo-serving path only
  - no data migration or schema action required to rollback serving behavior

## 6) Hard constraints for this baseline slice

This slice itself introduces no serving-path experiment and no cutover behavior.

Explicitly prohibited in this slice:

- Route cutover code
- Runtime serving-source switching
- Schema change
- Write-path or dual-write changes
- Backfill or migration orchestration
- API contract expansion

## 7) Result of this slice

This baseline provides a governed decision reference only.

Output decision:

- Not cutover-ready by default
- Cutover-experiment eligible only through a later, separate governed slice that implements the preconditions and rollback controls above
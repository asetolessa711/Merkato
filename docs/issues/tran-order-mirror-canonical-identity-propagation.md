# Scope Lock - TRAN: Order Mirror Canonical Product/Vendor Identity Propagation

## Intent

Propagate canonical product and vendor identity keys into the existing order mirror transitional path only.
This slice is bridge-only and must not introduce read cutover, write cutover, or broad workflow changes.

## NEW canonical path

* Treat canonical identity foundations as source fields only:

  * user external identity for vendors
  * product external identity for products
* Do not redefine NEW identity formats or model contracts in this slice.
* Consume existing NEW identity primitives as inputs to transitional mirror shaping.

## LEGACY path still present

* Existing Mongo-backed order runtime remains authoritative.
* Existing legacy Mongo ObjectId-based behavior remains authoritative for all live reads/writes.
* No endpoint contract changes and no API payload semantic changes.

## TRANSITIONAL bridge path, if any

* Update only transitional order mirror shaping and persistence payloads to include canonical vendor/product identity fields when available, while preserving current mirror behavior when they are absent.
* Keep legacy mirror fields intact for backward compatibility.
* Keep mirror writes additive and non-breaking.
* No read cutover.
* No dual-write expansion beyond existing mirror path.
* No backfill jobs.
* No migration orchestration.

## Untouched surfaces

* No checkout, payment, shipment, invoice, returns, or analytics behavior changes.
* No product catalog business logic changes.
* No vendor onboarding or account-management changes.
* No UI/E2E scope expansion.
* No schema-wide refactors outside strictly required mirror payload fields.

## Hard boundaries

* Restrict changes to transitional mirror service/script/test surfaces required for canonical identity propagation.
* Add focused unit/integration proof for additive mirror payload behavior only.
* Preserve existing runtime behavior and existing public API contracts.
* Do not introduce destination cutover logic.

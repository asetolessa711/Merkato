# Scope Lock — NEW: Product and Vendor Foundation

## Intent

Establish the canonical NEW foundation for product and vendor identity at the model/util layer only.
This slice is foundation-only and must not open migration, cutover, or broad behavior change work.

## NEW canonical path

* Introduce canonical identity foundation for Product and Vendor entities (NEW-first structure and utilities).
* Define canonical external identifier shape/validation/generation for Product and Vendor, aligned with the identity foundation pattern already established.
* Add narrowly scoped model-level guarantees and helper behavior needed to store, validate, and safely read canonical Product and Vendor external identifiers without changing external runtime behavior.
* Add focused unit tests proving the foundation invariants for Product and Vendor identity fields/utilities.

## LEGACY path still present

* Existing Mongo-backed runtime behavior and legacy identifiers remain authoritative for this slice.
* Existing read/write behavior that depends on legacy identifiers remains authoritative for this slice.
* No endpoint contracts or API payload semantics are changed in this slice.

## TRANSITIONAL bridge path, if any

* Optional, minimal bridge only at helper/lookup abstraction level if strictly required to connect NEW foundation with current internal model access.
* No read cutover.
* No dual-write introduction.
* No backfill job or migration orchestration.
* If no minimal bridge is required during implementation, this section is treated as intentionally empty.

## Untouched surfaces

* No order, checkout, payment, shipment, invoice, returns, or analytics workflow changes.
* No product catalog behavior changes beyond identity foundation primitives.
* No vendor onboarding/business-process changes.
* No UI/E2E scope expansion.
* No data backfill, no historical rewrite, no operational migration runbook in this slice.

## Hard boundaries

* Keep this slice model/util + focused unit tests only.
* Do not introduce broad repository-wide refactors.
* Do not modify external API contracts.
* Do not start migration execution work; only establish verifiable foundation primitives.

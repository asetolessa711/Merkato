Title: Scope Lock — TRAN: Order mirror canonical buyer identity propagation

Intent
Propagate canonical buyer identity into the existing order mirror transitional path only.
This slice is bridge-only and must not introduce read cutover, write cutover, or broad workflow changes.

NEW canonical path

* Treat canonical buyer external identity from the established identity foundation as source input only.
* Do not redefine canonical identity formats, generation rules, or model contracts in this slice.
* Consume existing canonical identity primitives strictly for transitional mirror shaping/persistence.

LEGACY path still present

* Existing Mongo-backed order runtime remains authoritative.
* Existing legacy Mongo ObjectId-based behavior remains authoritative for all live reads/writes.
* No endpoint contract changes and no API payload semantic changes.

TRANSITIONAL bridge path, if any

* Update only transitional order mirror shaping/persistence to include canonical buyer identity when available.
* Preserve current mirror behavior when canonical buyer identity is absent.
* Keep legacy mirror fields intact for backward compatibility.
* Keep mirror writes additive and non-breaking.
* No read cutover.
* No dual-write expansion beyond the existing mirror path.
* No backfill jobs.
* No migration orchestration.

Untouched surfaces

* No checkout, payment, shipment, invoice, returns, or analytics behavior changes.
* No product catalog business logic changes.
* No vendor onboarding/account-management changes.
* No UI/E2E scope expansion beyond proof updates strictly required by this bridge field propagation.
* No schema-wide refactors outside strictly required mirror payload fields/tests.

Hard boundaries

* Restrict changes to transitional mirror service/script/test surfaces required for canonical buyer identity propagation.
* Add focused proof for additive mirror payload behavior only (presence/absence handling and non-breaking invariants).
* Preserve existing runtime behavior and public API contracts.
* Do not introduce destination cutover logic.
* MongoDB touches are allowed only where directly required to enable PostgreSQL transition proof for this field propagation; no broad Mongo stabilization.
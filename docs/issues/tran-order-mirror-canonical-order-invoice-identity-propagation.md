Scope Lock — TRAN: Order mirror canonical order/invoice identity propagation

**Intent**
Propagate canonical order and invoice identity into the existing order mirror transitional path only.
This slice is bridge-only and must not introduce read cutover, write cutover, or broad workflow changes.

**NEW canonical path**

* Treat canonical order external identity and canonical invoice external identity from established foundations as source input only.
* Do not redefine canonical identity formats, generation rules, or model contracts in this slice.
* Consume existing canonical order/invoice identity primitives strictly for transitional mirror shaping and persistence.

**LEGACY path still present**

* Existing Mongo-backed order and invoice runtime remains authoritative.
* Existing legacy Mongo ObjectId-based behavior remains authoritative for all live reads and writes.
* No endpoint contract changes and no API payload semantic changes.

**TRANSITIONAL bridge path, if any**

* Update only transitional order mirror shaping and persistence to include canonical order identity and canonical invoice identity when available.
* Preserve current mirror behavior when canonical order/invoice identity is absent.
* Keep legacy mirror fields intact for backward compatibility.
* Keep mirror writes additive and non-breaking.
* No read cutover.
* No dual-write expansion beyond the existing mirror path.
* No backfill jobs.
* No migration orchestration.

**Untouched surfaces**

* No checkout, payment, shipment, returns, or analytics behavior changes.
* No product catalog or vendor-account business logic changes.
* No UI or E2E scope expansion beyond proof updates strictly required by this field propagation.
* No schema-wide refactors outside strictly required mirror payload fields and focused tests.

**Hard boundaries**

* Restrict changes to transitional mirror service/script/test surfaces required for canonical order/invoice identity propagation.
* Add focused proof for additive mirror payload behavior only, including presence/absence handling and non-breaking invariants.
* Preserve existing runtime behavior and public API contracts.
* Do not introduce destination cutover logic.
* MongoDB touches are allowed only where directly required to enable PostgreSQL transition proof for this field propagation; no broad Mongo stabilization.

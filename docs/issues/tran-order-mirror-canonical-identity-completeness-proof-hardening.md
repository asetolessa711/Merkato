Scope Lock — TRAN: Order mirror canonical identity completeness proof hardening

**Intent**
Harden proof and validation for canonical identity completeness in the existing order mirror transitional path only.
This slice is proof-hardening only and must not introduce read cutover, write cutover, or broad workflow changes.

**NEW canonical path**

* Treat the existing canonical identity set as the source contract for mirror completeness:

  * buyer external identity
  * vendor external identity
  * product external identity
  * order external identity
  * invoice external identity
* Do not redefine canonical ID formats, generation rules, or model contracts in this slice.
* Add focused proof assertions and validation logic that verify:

  * canonical IDs are mirrored when present in source records
  * nullable/additive behavior remains valid when canonical IDs are absent in source records
  * canonical-to-legacy linkage invariants remain intact.

**LEGACY path still present**

* Existing Mongo-backed order and invoice runtime remains authoritative.
* Existing legacy Mongo ObjectId-based behavior remains authoritative for all live reads and writes.
* Legacy mirror identifier fields remain intact and required for backward compatibility.
* No endpoint contract changes and no API payload semantic changes.

**TRANSITIONAL bridge path, if any**

* Update only transitional mirror proof/check/test and narrowly related mirror service validation surfaces needed to enforce canonical identity completeness invariants.
* Keep bridge behavior additive and non-breaking.
* No read cutover.
* No dual-write expansion beyond the existing mirror path.
* No backfill jobs.
* No migration orchestration.

**Untouched surfaces**

* No checkout, payment, shipment, returns, or analytics behavior changes.
* No product catalog or vendor-account business logic changes.
* No UI or E2E scope expansion beyond proof-path checks required for this hardening.
* No schema-wide refactors.
* No destination read-path adoption.

**Hard boundaries**

* Restrict changes to transitional mirror service validation, runtime proof scripts, check scripts, and focused tests required for identity-completeness hardening.
* Preserve existing runtime behavior and public API contracts.
* Do not introduce destination cutover logic.
* MongoDB touches are allowed only where directly required to validate PostgreSQL transition proof for identity-completeness checks; no broad Mongo stabilization.
* Keep PR in Draft until executed CI proof evidence is complete and green.

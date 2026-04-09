Scope Lock — NEW: Order and invoice external-ID foundation

**Intent**
Establish canonical external-ID foundation for Order and Invoice entities at model and utility boundaries only.
This slice is foundation-only and must not open read cutover, write cutover, or broad workflow changes.

**NEW canonical path**

* Introduce canonical external-ID primitives for Order and Invoice, aligned with the existing identity foundation pattern.
* Define generation, normalization, validation, uniqueness, and immutability policy for Order and Invoice canonical IDs.
* Add minimal model-level persistence and helper hooks so newly created Order and Invoice records can carry canonical external IDs and older records can be read safely without changing external runtime behavior.
* Add focused unit and integration tests proving:

  * ID shape validity
  * Uniqueness guarantees
  * stable linkage between legacy Mongo IDs and canonical external IDs
  * backward-safe reads where canonical IDs may be absent on older data
* Add non-invasive observability for canonical ID assignment and validation outcomes.

**LEGACY path still present**

* Mongo ObjectId remains authoritative for all live order and invoice read and write behavior in this slice.
* Existing order creation, invoice generation, and API payload contracts remain unchanged.
* No client-visible identifier contract changes are allowed.

**TRANSITIONAL bridge path, if any**

* Introduce minimal internal mapping helpers between legacy Mongo IDs and canonical Order/Invoice external IDs only where strictly required.
* Transitional bridge is internal-only and additive.
* No read cutover.
* No dual-write expansion beyond existing mirror behavior.
* No backfill jobs.
* No migration orchestration.

**Untouched surfaces**

* No checkout, payment, shipment, returns, or analytics behavior changes.
* No PostgreSQL read-path adoption.
* No order mirror payload propagation changes in this slice.
* No UI or E2E scope expansion beyond narrowly required foundation proof.
* No schema-wide refactors outside strict Order/Invoice identity foundation surfaces.

**Hard boundaries**

* Restrict changes to model, identity utility, and focused tests required for Order/Invoice external-ID foundation.
* Preserve runtime behavior and all public API contracts.
* Do not introduce destination cutover logic.
* Any MongoDB touch must be transition-enabling only for canonical Order/Invoice identity foundation, not Mongo modernization.
* Keep PR draft until foundation validation evidence is complete.

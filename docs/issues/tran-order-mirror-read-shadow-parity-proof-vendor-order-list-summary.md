Scope Lock — TRAN: Order mirror read-shadow parity proof (vendor order-list summary contract)

**Intent**
Prove read-parity for the vendor order-list summary contract using PostgreSQL mirror data in shadow mode only.
This slice is proof-only and must not introduce read cutover, write cutover, or broad workflow changes.

**NEW canonical path**

* Treat mirrored canonical identity fields already propagated and parity-hardened as source keys for vendor-list shadow proof.
* Define a narrow shadow projection contract for vendor order-list summary parity checks only:

  * order identity linkage
  * vendor identity linkage
  * vendor-scoped status and financial summary fields
  * vendor-scoped item count invariant
  * list ordering invariant for covered results
* Do not redefine canonical ID formats, generation rules, or model contracts in this slice.
* Add focused parity assertions that validate mirror-derived vendor order-list summary projection matches Mongo-authoritative vendor list summary for covered fields.

**LEGACY path still present**

* Existing Mongo-backed order read/write runtime remains authoritative.
* Existing Mongo ObjectId-based live reads remain authoritative for all production responses.
* No endpoint contract changes and no API payload semantic changes.
* No request routing changes to serve vendor order-list reads from PostgreSQL.

**TRANSITIONAL bridge path, if any**

* Add only shadow-read proof/check surfaces that construct a mirror-derived vendor order-list summary projection and compare against Mongo source.
* Keep all shadow behavior non-serving, additive, and non-breaking.
* No read cutover.
* No dual-write expansion beyond the existing mirror path.
* No backfill jobs.
* No migration orchestration.

**Untouched surfaces**

* No checkout, payment, shipment, returns, or analytics behavior changes.
* No customer order-detail contract expansion.
* No admin order-list contract work in this slice.
* No product catalog or vendor-account business logic changes.
* No UI or E2E scope expansion beyond parity-proof checks required for this slice.
* No schema-wide refactors.
* No destination-read adoption in runtime request handling.

**Hard boundaries**

* Restrict changes to transitional mirror shadow-list projection, parity proof scripts/checks, and focused tests required for vendor order-list summary parity evidence.
* Preserve existing runtime behavior and public API contracts.
* Do not introduce destination cutover logic.
* MongoDB touches are allowed only where directly required to validate PostgreSQL shadow-list parity.
* Keep PR in Draft until CI parity-proof evidence is complete and green.

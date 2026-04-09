Scope Lock — TRAN: Order mirror read-shadow parity proof (customer order-list summary contract)

**Intent**
Prove read-parity for the customer order-list summary contract using PostgreSQL mirror data in shadow mode only.
This slice is proof-only and must not introduce read cutover, write cutover, or broad workflow changes.

**NEW canonical path**

* Treat mirrored canonical identity fields already propagated and parity-hardened as source keys for shadow list-read proof.
* Define a narrow shadow projection contract for customer order-list summary parity checks only:

  * order identity linkage
  * status/currency/totals summary fields
  * vendor/item count summary invariants
  * list ordering invariant for covered results
* Do not redefine canonical ID formats, generation rules, or model contracts in this slice.
* Add focused parity assertions that validate mirror-derived customer order-list summary projection matches Mongo-authoritative list summary for covered fields.

**LEGACY path still present**

* Existing Mongo-backed order read/write runtime remains authoritative.
* Existing Mongo ObjectId-based live reads remain authoritative for all production responses.
* No endpoint contract changes and no API payload semantic changes.
* No request routing changes to serve customer order-list reads from PostgreSQL.

**TRANSITIONAL bridge path, if any**

* Add only shadow-read proof/check surfaces that construct a mirror-derived customer order-list summary projection and compare against Mongo source.
* Keep all shadow behavior non-serving, additive, and non-breaking.
* No read cutover.
* No dual-write expansion beyond the existing mirror path.
* No backfill jobs.
* No migration orchestration.

**Untouched surfaces**

* No checkout, payment, shipment, returns, or analytics behavior changes.
* No product catalog or vendor-account business logic changes.
* No order-detail contract expansion in this slice beyond list-summary parity proof needs.
* No UI or E2E scope expansion beyond parity-proof checks required for this slice.
* No schema-wide refactors.
* No destination-read adoption in runtime request handling.

**Hard boundaries**

* Restrict changes to transitional mirror shadow-list projection, parity proof scripts/checks, and focused tests required for customer order-list summary parity evidence.
* Preserve existing runtime behavior and public API contracts.
* Do not introduce destination cutover logic.
* MongoDB touches are allowed only where directly required to validate PostgreSQL shadow-list parity.
* Keep PR in Draft until CI parity-proof evidence is complete and green.

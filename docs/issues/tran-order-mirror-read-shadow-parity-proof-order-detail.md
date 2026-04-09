Scope Lock — TRAN: Order mirror read-shadow parity proof (order detail contract)

**Intent**
Prove read-parity for the order detail contract using PostgreSQL mirror data in shadow mode only.
This slice is proof-only and must not introduce read cutover, write cutover, or broad workflow changes.

**NEW canonical path**

* Treat mirrored canonical identity fields already propagated and completeness-hardened as the source keys for shadow read proof.
* Define a narrow shadow projection contract for order detail parity checks only:

  * order identity linkage
  * buyer linkage
  * vendor and item linkage
  * order totals and invoice linkage invariants
* Do not redefine canonical ID formats, generation rules, or model contracts in this slice.
* Add focused parity assertions that validate mirror-derived order detail projection matches Mongo-authoritative order detail for the covered fields.

**LEGACY path still present**

* Existing Mongo-backed order read/write runtime remains authoritative.
* Existing Mongo ObjectId-based live reads remain authoritative for all production responses.
* No endpoint contract changes and no API payload semantic changes.
* No request routing changes to serve order reads from PostgreSQL.

**TRANSITIONAL bridge path, if any**

* Add only shadow-read proof/check surfaces that construct a mirror-derived order detail projection and compare against Mongo source.
* Keep all shadow behavior non-serving, additive, and non-breaking.
* No read cutover.
* No dual-write expansion beyond the existing mirror path.
* No backfill jobs.
* No migration orchestration.

**Untouched surfaces**

* No checkout, payment, shipment, returns, or analytics behavior changes.
* No product catalog or vendor-account business logic changes.
* No UI or E2E scope expansion beyond parity-proof checks required for this slice.
* No schema-wide refactors.
* No destination-read adoption in runtime request handling.

**Hard boundaries**

* Restrict changes to transitional mirror shadow-read projection, parity proof scripts/checks, and focused tests required for order detail parity evidence.
* Preserve existing runtime behavior and public API contracts.
* Do not introduce destination cutover logic.
* MongoDB touches are allowed only where directly required to validate PostgreSQL shadow-read parity.
* Keep PR in Draft until CI parity-proof evidence is complete and green.

Scope Lock — TRAN: Order mirror read-shadow parity proof (admin order-list summary contract)

**Intent**
Prove read-parity for the admin order-list summary contract using PostgreSQL mirror data in shadow mode only.
This slice is proof-only and must not introduce read cutover, write cutover, or broad workflow changes.

**NEW canonical path**

* Define a narrow admin order-list summary shadow projection from PostgreSQL mirror using already propagated canonical identities.
* Compare mirror-derived admin list summaries against Mongo-authoritative admin list summaries for covered fields only.
* Enforce covered-results ordering and parity invariants for admin list contract fields.
* Keep canonical-ID format/rules unchanged; consume existing identity foundation only.

**LEGACY path still present**

* Existing Mongo-backed order reads remain production-serving authority.
* Existing admin order-list runtime behavior and API contracts remain unchanged.
* No request routing changes to serve admin list reads from PostgreSQL.

**TRANSITIONAL bridge path, if any**

* Add only non-serving parity comparator/proof logic for admin order-list summary.
* Extend existing proof/check scripts to include admin list shadow parity assertions and discrepancy reporting.
* Add focused unit tests for strict mismatch detection, additive canonical behavior, covered-results-only behavior, and ordering invariants.
* Keep all behavior additive and non-breaking.

**Untouched surfaces**

* No checkout, payment, shipment, returns, or analytics behavior changes.
* No customer order-detail contract expansion.
* No customer or vendor list contract expansion beyond already completed slices.
* No schema migration orchestration, backfill jobs, or dual-write expansion.
* No frontend/UI scope expansion.

**Hard boundaries**

* Restrict changes to mirror shadow-list projection logic, parity proof/check scripts, and focused tests required for admin order-list summary evidence.
* Preserve existing runtime behavior and public API payload semantics.
* Do not introduce destination read cutover logic.
* MongoDB touches are allowed only where directly required for parity proof.
* Keep PR in Draft until CI parity-proof evidence is complete and green.

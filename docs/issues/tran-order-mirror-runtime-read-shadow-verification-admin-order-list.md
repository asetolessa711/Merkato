Scope Lock — TRAN: Order mirror runtime read-shadow verification (admin order-list live contract)

**Objective**
Add a narrow, runtime, non-serving verification layer that evaluates PostgreSQL mirror admin order-list results against Mongo-authoritative admin order-list results for covered live requests and emits governed parity evidence. No serving cutover in this slice.

**NEW canonical path**

* Execute canonical PostgreSQL admin order-list query semantics for the already covered contract fields only:

  * status filter behavior
  * date-range filter behavior
  * deterministic sort precedence
  * pagination window behavior
* Normalize mirror results into the same covered comparison contract used by existing parity proofs.
* Emit structured parity telemetry for covered runtime comparisons only (match, mismatch class, comparator confidence, latency deltas).

**LEGACY path still present**

* Mongo-backed admin order-list remains the only production-serving source of truth.
* Existing admin API request and response semantics remain unchanged.
* No request routing changes to serve admin order-list from PostgreSQL.

**TRANSITIONAL bridge path, if any**

* Add shadow dual-evaluation on covered admin order-list reads: Mongo authoritative evaluation plus PostgreSQL mirror evaluation.
* Compare covered ordering, membership, and page-boundary semantics for the same request parameters.
* Record mismatch evidence and diagnostics; do not alter response payloads.
* Keep behavior fail-safe and non-serving: any comparison uncertainty only logs evidence and preserves Mongo-served output.

**Untouched surfaces**

* No read cutover for any endpoint.
* No write-path, dual-write, or mirror-write behavior changes.
* No customer order-list, vendor order-list, or order-detail scope expansion.
* No invoice-route, returns, or backfill/migration orchestration work.
* No frontend/UI contract changes.
* No auth/role model changes.

**Hard boundaries**

* Restrict changes to admin order-list runtime shadow comparator, normalization, telemetry, and focused tests/checks needed for governed evidence.
* No schema broadening beyond fields strictly required for covered comparison.
* No production flag that serves PostgreSQL results.
* No fallback-routing changes because no serving switch is introduced.
* Keep PR in Draft until runtime parity evidence is green and mismatch reporting is stable.
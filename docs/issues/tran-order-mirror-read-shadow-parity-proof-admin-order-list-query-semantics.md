Scope Lock — TRAN: Order mirror read-shadow parity proof (admin order-list query semantics contract)

Objective
Add a narrow, CI-enforced proof that admin order-list query semantics remain parity-safe between Mongo source behavior and Postgres mirror behavior for the covered admin list contract.

NEW canonical path
Define and validate a canonical admin query-semantics contract for the covered parameters only:

* status filter behavior
* date-range filter behavior
* deterministic sort precedence
* pagination window behavior (page/limit or cursor window, whichever is already in contract)

LEGACY path still present
Mongo-backed admin order-list behavior remains the serving source of truth with no serving-path change.

TRANSITIONAL bridge path
Proof-only dual-evaluation in CI/local scripts:

* compute covered query result sets from source and mirror for the same seeded dataset and parameters
* compare ordering, membership, and page boundaries
* fail CI on mismatch

No production read-routing change.

Untouched surfaces

* No frontend changes
* No API contract expansion
* No write-path or mutation changes
* No customer/vendor list-surface changes
* No invoice-route migration work
* No auth/role logic changes
* No database cutover

Hard boundaries

* Keep PR Draft until all checks are green
* Only admin order-list query semantics parity proof artifacts (comparator/proof scripts/tests) may change
* No schema broadening except strictly required proof fields already in-scope
* No runtime switch to mirror reads
* No scope expansion beyond this contract without a new governed slice
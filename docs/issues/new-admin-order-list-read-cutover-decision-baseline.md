Scope Lock — NEW: Admin order-list read-cutover decision baseline

**Objective**
Create a narrow decision baseline that defines whether and how the covered admin order-list contract could be considered for a future serving-path experiment. This slice is decision and governance only. No read cutover is allowed in this slice.

**NEW canonical path**

* Define the exact covered admin order-list contract eligible for future cutover consideration:

  * Covered filters: status, date-range
  * Covered ordering: deterministic sort precedence
  * Covered pagination: page and limit window semantics
  * Covered summary fields: order identity linkage, buyer linkage, status, currency, payment method, totals, vendor count, item count, invoice count
  * Covered ordering tie-break behavior for stable windows
* Summarize achieved evidence for this covered contract from completed slices:

  * write-path mirror proof and verification
  * identity foundations and external-ID foundations
  * canonical identity propagation across product, vendor, buyer, order, invoice
  * identity completeness hardening
  * read-shadow parity proofs for order detail, customer list summary, vendor list summary, admin list summary
  * admin order-list query semantics parity proof
  * runtime non-serving admin order-list shadow verification
* Define remaining gaps, uncertainty classes, and exclusions:

  * unproven behavior outside covered contract parameters
  * long-tail production-shape variance risk not fully eliminated
  * degraded dependency behavior in a serving-path mode not yet exercised
  * operational uncertainty for sustained mismatch and latency drift handling
* Define required preconditions for any future serving-path experiment:

  * explicit feature-gate and kill-switch requirements
  * mandatory observability signals and alert thresholds
  * explicit go and no-go criteria
  * approval and sign-off requirements across engineering and operations
* Define rollback conditions for any future serving-path experiment:

  * immediate rollback triggers on parity mismatch classes
  * rollback triggers on latency and error-budget regression
  * rollback triggers on coverage-gap growth or telemetry integrity failure
  * rollback execution expectation: config-level reversion to Mongo-serving path without data migration action

**LEGACY path still present**

* Mongo-backed admin order-list remains the only production-serving source of truth.
* Existing request and response behavior remains unchanged.
* No serving-path routing change to PostgreSQL.

**TRANSITIONAL bridge path, if any**

* Existing shadow verification remains non-serving and evidence-only.
* Existing parity telemetry remains warning-only and non-blocking for runtime responses.
* Transitional bridge behavior may be documented and classified, but not expanded into cutover logic.

**Untouched surfaces**

* No route serving-path cutover code.
* No schema changes.
* No write-path or dual-write changes.
* No customer or vendor list cutover scope.
* No order-detail cutover scope.
* No frontend or API contract expansion.
* No migration orchestration or backfill work.

**Hard boundaries**

* Decision baseline artifacts only, with explicit contract, evidence summary, gap register, guardrails, and rollback criteria.
* No implementation of serving-path experiment in this slice.
* No new proof domains beyond admin order-list covered contract decision framing.
* Keep PR in Draft until baseline is complete, reviewable, and approved as the governed reference for any later cutover-experiment slice.

**Direct cutover recommendation**
Not recommended at this stage. The evidence supports creating a governed cutover decision baseline now, but does not yet justify immediate serving-path cutover without the explicit guardrail and rollback baseline this slice establishes.
Scope Lock — TRAN: Customer order-history runtime read-shadow and ownership contract baseline

Objective
Start the Customer Order Visibility and History Migration Tranche with a meaningful, evidence-first transitional slice that validates runtime customer order-history parity and ownership semantics without any serving cutover.

NEW canonical path

- Define the covered customer order-history contract for this tranche start:
  - endpoint aliases: /api/orders/my-orders and /api/orders/my
  - buyer ownership boundary
  - list ordering and stable window semantics for covered results
  - covered summary fields already established by customer parity proof inputs
- Add runtime non-serving read-shadow verification for covered customer order-history reads:
  - compare Mongo-authoritative source results with PostgreSQL mirror-derived covered summaries
  - classify mismatches with deterministic mismatch classes
  - emit structured telemetry for parity, coverage, latency, and ownership/visibility mismatches
- Add focused runtime checks ensuring alias consistency between /my-orders and /my for covered contract behavior.

LEGACY path still present

- Mongo-backed customer order-history remains the only serving source.
- Existing customer order-history request/response behavior remains authoritative.
- No PostgreSQL-serving response path is enabled in this slice.

TRANSITIONAL bridge path, if any

- Use shadow comparison only for evidence gathering and contract validation.
- Keep all runtime verification non-serving and fail-closed.
- Any comparator uncertainty, telemetry degradation, or coverage gap preserves Mongo-serving output.

Untouched surfaces

- No admin route work.
- No vendor order serving-path migration.
- No product catalog serving-path migration.
- No schema changes.
- No write-path or dual-write changes.
- No frontend contract expansion beyond covered customer order-history validation hooks needed for evidence.
- No migration orchestration/backfill execution.

Hard boundaries

- Restrict implementation to customer order-history runtime comparator, ownership/visibility contract checks, telemetry, and focused tests.
- No serving-path switch logic in this slice.
- No cutover behavior or routing fallback to PostgreSQL serving.
- No guest-order retrieval expansion in this slice unless already covered by the existing customer parity/read contract evidence.
- Keep PR in Draft until focused runtime evidence and CI are complete and green.

Acceptance evidence required in PR

- Focused tests proving:
  - Mongo remains serving source under all runtime verification outcomes
  - alias consistency for covered contract between /my-orders and /my
  - ownership/visibility mismatch classes are emitted when expected
  - coverage-gap and comparator-failure paths are fail-closed
- CI green with no schema changes and no write-path changes.
- Published runtime telemetry evidence samples for covered customer history reads.

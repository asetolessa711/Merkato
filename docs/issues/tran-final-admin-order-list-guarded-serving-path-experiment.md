Scope Lock — TRAN: Final admin order-list guarded serving-path experiment

**Objective**
Run a narrow, reversible, evidence-first serving-path experiment for admin order-list reads only. This is the final planned admin migration slice unless a real defect later requires a follow-up.

**NEW canonical path**

- Introduce a guarded serving decision for GET /api/admin/orders within the already covered admin order-list contract only.
- Keep experiment fail-closed by default.
- Allow PostgreSQL-serving only when the guard is enabled and readiness is explicitly eligible.
- Emit structured, per-request serving-decision telemetry to prove source choice and fallback reason.
- Preserve immediate rollback capability through kill-switch/config controls with no redeploy dependency.

**LEGACY path still present**

- Mongo remains the default serving source.
- Existing request/response semantics for covered admin order-list fields remain unchanged.
- Any guard uncertainty or degradation must preserve Mongo-serving behavior.

**TRANSITIONAL bridge path, if any**

- Use existing readiness and parity signals as hard preconditions for serving-path eligibility.
- If comparator/parity/degradation signals fail, route immediately falls back to Mongo.
- Keep fallback deterministic, explicit, and auditable in telemetry.

**Untouched surfaces**

- No schema changes.
- No write-path changes.
- No dual-write changes.
- No customer-list, vendor-list, or order-detail serving changes.
- No frontend/API contract expansion.
- No auth or role-model expansion.
- No migration/backfill orchestration.

**Hard boundaries**

- Restrict scope to admin order-list serving-source guard logic, rollback behavior, telemetry, and focused proof tests.
- No expansion outside the covered admin order-list contract.
- No broad cutover and no permanent serving-source migration in this slice.
- Keep PR in Draft until focused proofs and CI evidence are complete and green.
- Treat this as the final planned admin migration slice; post-slice planning pivots to customer/vendor/product domains unless a real defect forces admin follow-up.

**Explicit proof requirements**

- gate off -> Mongo serves.
- kill switch active -> Mongo serves.
- readiness blocked -> Mongo serves.
- eligible guarded path -> PostgreSQL serves only within the guarded experiment path for the covered admin order-list contract.
- degradation or comparator/parity failure -> immediate fallback to Mongo.

**Acceptance evidence required in PR**

- Focused tests proving all five serving-decision behaviors above.
- CI green with no new schema or write-path deltas.
- Clear telemetry evidence showing serving-source decisions and fallback reasons.
- Explicit rollback demonstration showing kill-switch/config reversion to Mongo path.

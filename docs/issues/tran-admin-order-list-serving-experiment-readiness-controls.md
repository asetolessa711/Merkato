Scope Lock — TRAN: Admin order-list serving-experiment readiness controls

**Objective**
Add fail-closed readiness controls for a future admin order-list serving experiment while keeping Mongo as the only serving path in this slice. Produce structured readiness telemetry from existing runtime parity signals.

**NEW canonical path**

* Introduce explicit readiness control resolution for admin order-list experiment gate, kill switch, and bounded latency guard thresholds.
* Evaluate readiness classification from runtime parity and comparator telemetry into deterministic blocked or eligible outputs.
* Emit structured readiness telemetry on runtime verification paths.

**LEGACY path still present**

* Mongo-backed admin order-list remains the only production-serving source.
* Existing API request and response payload semantics remain unchanged.
* No PostgreSQL response serving is enabled.

**TRANSITIONAL bridge path, if any**

* Consume existing runtime read-shadow parity results as readiness inputs.
* Keep all readiness outcomes non-serving and observability-only.
* Preserve fail-closed behavior for invalid controls, missing parity, telemetry degradation, comparator errors, or mismatch classes.

**Untouched surfaces**

* No read cutover for any endpoint.
* No write-path or dual-write behavior changes.
* No schema or migration changes.
* No customer order-list, vendor order-list, or order-detail scope expansion.
* No frontend/UI contract changes.
* No auth/role model changes.

**Hard boundaries**

* Restrict changes to admin order-list readiness controls, telemetry, and focused service tests.
* No serving-path switch or routing fallback logic for PostgreSQL serving.
* Keep behavior explicitly fail-closed to legacy serving defaults.
* Keep PR in Draft until focused tests are green and readiness telemetry semantics are stable.

Scope Lock — TRAN: Customer order-history read-cutover decision baseline

Objective
Define a governed, evidence-first decision baseline for customer order-history read serving progression after completion of the guarded serving-path experiment, without introducing any cutover in this slice.

In-scope surface
- Customer order-history only.
- Covered aliases: /my-orders and /my.
- Decision and governance artifacts only.

TRANSITIONAL governance path
- Produce a customer order-history read-cutover decision baseline artifact that records:
- covered contract definition and alias-consistency requirements
- current evidence summary from runtime shadow, readiness controls, and guarded serving experiment
- explicit go/no-go criteria for any future serving-policy transition
- explicit rollback criteria and kill-switch expectations
- explicit fail-closed requirements for comparator/runtime failure paths
- gap register and required follow-up evidence before any future transition

LEGACY path still present
- Mongo remains the default serving source unless and until a future, separately governed slice approves otherwise.

TRANSITIONAL path context
- Existing guarded PostgreSQL serving remains governed by current explicit eligibility checks and fail-closed behavior.
- No new serving behavior is introduced in this slice.

Out of scope
- No runtime code changes.
- No cutover behavior.
- No guest-order retrieval expansion.
- No schema work.
- No write-path work.
- No dual-write expansion.
- No scope expansion outside covered customer order-history contract.
- No domain pivot outside Customer Order Visibility and History Migration Tranche.

Hard boundaries
- Restrict changes to decision-baseline documentation and governance evidence organization.
- No endpoint contract changes.
- No additional migration surfaces.

Acceptance evidence required in PR
- Decision baseline artifact committed with explicit go/no-go criteria.
- Explicit rollback and kill-switch criteria documented.
- Explicit alias-consistency requirement for /my-orders and /my documented.
- Explicit statement that this slice performs no serving cutover and no runtime expansion.
- CI green.

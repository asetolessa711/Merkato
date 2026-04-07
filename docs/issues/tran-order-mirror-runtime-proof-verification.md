# TRAN — Order mirror runtime proof and verification (Mongo-canonical -> PostgreSQL transition)

## Short Findings Summary (Abandoned Attempt)
- PR #62 became empty versus current main and stopped being a trustworthy execution vehicle.
- Identifiable unmerged Phase 2 work existed only in dirty local state and branch-local continuity, not as a clean governed PR diff.
- Canonical proof workflow attachment can fail to appear when the PR diff is empty and path filters are used.

## Scope Lock

### NEW canonical path
- PostgreSQL mirror hardening and runtime proof for order creation, with governance evidence produced via CI.
- Canonical closure evidence comes from CI-only runtime proof workflow and required checks.

### LEGACY path still present
- MongoDB remains canonical for order creation while transition is in progress.
- Existing Mongo order write/read behavior remains unchanged in this slice.

### TRANSITIONAL bridge path
- Mirror-only PostgreSQL writes from the Mongo-canonical order creation flow.
- Verification/observability compares Mongo source shape to mirrored PostgreSQL shape.
- Mongo touches are allowed only when directly enabling PostgreSQL transition proof/verification.

### Untouched surfaces
- No read-path cutover.
- No backfill.
- No invoice/returns migration.
- No broader identity/product migration.
- No external API behavior changes.
- No Mongo modernization/stabilization work as destination progress.

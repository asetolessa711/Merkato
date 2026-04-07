# NEW — Identity and external-ID foundation (canonical model baseline)

## Purpose
- Establish the first canonical NEW slice for identity and external IDs with clear governance boundaries.
- Define stable identity primitives required by future migration slices without changing external behavior yet.

## Scope lock (strict)

### NEW canonical path
- Introduce canonical external-ID foundation primitives and invariants for core identity entities.
- Define normalized identity key semantics (generation/format/uniqueness/immutability policy).
- Add foundational persistence/model hooks needed to store, validate, and safely read canonical external IDs without changing external runtime behavior.
- Add focused validation/tests for ID shape, uniqueness, referential linkage, and backward-safe reads.
- Add observability for ID assignment/validation outcomes (non-invasive, internal only).

### LEGACY path still present
- Existing Mongo `_id`-based operational behavior remains active and canonical for runtime behavior in this slice.
- Existing auth/session/account flows continue unchanged.

### TRANSITIONAL bridge path
- Bridge mapping between legacy identifiers and canonical external IDs where required for internal consistency.
- Transitional reads/writes are internal-only and must not alter API response contracts.
- No cutover: bridge enables later migration slices, not destination-state behavior changes now.

### Untouched surfaces
- No auth UX redesign.
- No permission/role model redesign.
- No checkout/order flow behavior changes.
- No read-path cutover.
- No backfill execution in this slice.
- No invoice/returns migration.
- No product-domain migration.
- No external API contract changes.
- No client-visible identifier format changes.

## Governance notes
- Keep PR in Draft until foundation validation evidence is complete.
- Require explicit NEW / LEGACY / TRANSITIONAL labels in issue/PR body.
- Any Mongo touch must be transition-enabling only for canonical ID foundation, not Mongo modernization.
- No parked or local-only continuity may be treated as source of truth; remote issue, branch, and PR state are canonical.

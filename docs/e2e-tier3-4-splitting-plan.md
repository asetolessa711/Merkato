# Tier 3–4 Heavy Spec Strategy (Deferred / Split)
Date: 2025-09-12
Scope: Provide actionable split + deferral plans for heavy / composite specs not suitable for PR smoke without optimization.

Specs Covered:
- adminOrdersBulkDialogs.cy.js
- customerFlow.cy.js
- auth_roles.cy.js

## Guiding Principles
- Keep PR smoke < 30s ideal (current ~19s with 7 specs).
- Any added spec must (a) add unique signal, (b) run ≤ ~4s median, (c) avoid overlapping assertions already covered by smoke specs.
- Heavy, multi-purpose specs migrate to: (1) Nightly suite, (2) Split lighter shards for smoke eligibility, or (3) Component/API-level coverage.

---
## 1. adminOrdersBulkDialogs.cy.js (Dialogs Focus)
Current Shape: 2 UI-heavy dialog flows (export + resend emails) with repeated seed + checkbox selection each test.
Primary Value: Verifies modal preview -> confirm -> summary pipeline.
Overlap: Core bulk action logic already partially exercised by `adminOrdersBulkActions.cy.js`.

### Split / Refactor Options
| Option | Action | Pros | Cons | Target Runtime |
|--------|--------|------|------|----------------|
| A (Merge) | Inline a single representative dialog path (export) into existing `adminOrdersBulkActions` as 1 extra test | Zero new spec, shared setup | Slightly lengthens existing spec | +1–1.5s |
| B (Slim Shard) | Create `adminOrdersBulkDialogs_smoke.cy.js` with ONLY one path (export) & tag @smoke | Isolated, small | Extra spec mgmt | 2–2.5s |
| C (Nightly Only) | Move current file (both dialogs) to nightly tag (@nightly @dialogs) | No smoke impact | Lose immediate feedback | 4–5s (unchanged) |

### Recommended Path
1. Adopt Option A (merge export path) OR Option B if avoiding large file growth. Remove duplicate email preview path from smoke scope.
2. Keep full dual-path version as `adminOrdersBulkDialogs_full.cy.js` tagged `@nightly` if both needed.
3. Use shared helper: `openBulkAction(actionLabel)` to reduce selector duplication.

### Micro-Optimizations (if retained)
- Replace broad `cy.get('input[type="checkbox"]').check({ force:true })` with data-testid targeted selection.
- Seed orders ONCE in `before()` not `beforeEach()` using deterministic IDs. Follow with lightweight mutation per test if needed.
- Collapse confirmation assertions to a single stable element (e.g., `[data-testid=bulk-summary]`).

---
## 2. customerFlow.cy.js (Monolithic Journey)
Current Shape: 5 tests mixing: full register->checkout journey, negative login, empty cart, session persistence, cart persistence.
Issues: High lifecycle overhead (multi auth + page hops). Overlap with `frictionless_checkout` + cart/checkout button spec.

### Decomposition Plan
| New Spec | Purpose | Keep For Smoke? | Est. Median (after split) |
|----------|---------|-----------------|---------------------------|
| customer_register_and_checkout.cy.js | Registration + single fast checkout (COD) | Potential (if <=3.5s and unique) | 3.0–3.5s (with stubs) |
| customer_negative_login.cy.js | Invalid login feedback | Probably NOT (move to nightly) | 0.8–1.0s |
| customer_cart_empty_guard.cy.js | Empty cart disallows checkout | Redundant (cart button spec already covers) | 0.6s |
| customer_session_persistence.cy.js | Auth session persists after reload | Nightly resilience | 1.2–1.6s |
| customer_cart_persistence.cy.js | Cart state + localStorage after reload | Nightly resilience | 1.4–1.8s |

### Recommended Path
1. Extract only key path not already covered: user registration to authenticated checkout (ensure coverage: registration form + redirect + authorized checkout path distinct from frictionless guest checkout).
2. Drop (or nightly) cart empty and negative login (smoke already exercises login in other contexts if present elsewhere—otherwise add a tiny 1-test auth smoke spec later).
3. Move persistence tests to `@resilience @nightly`.

### Speed Levers
- Pre-seed product; skip repeated navigation (directly visit `/shop` after register/login).
- Stub payment intent, analytics, marketing endpoints (see optimization doc).
- Use `cy.task('createUser', {...})` alternative to form-based registration (keep ONE UI registration test nightly for regression).

---
## 3. auth_roles.cy.js (Large Role Matrix)
Current Shape: 11 tests covering allowed + disallowed paths for 6 role/persona contexts.
Issues: Sequential role logins + page transitions dominate time; redundant dashboard visibility checks.

### Splitting Strategy
| Shard | Tests | Purpose | Smoke Eligibility | Est. Median |
|-------|-------|---------|-------------------|-------------|
| auth_roles_positive.cy.js | Customer, Vendor, Admin (3 positive) | Core allowed routes work | Maybe (goal ≤2.2s) | 2.0–2.4s |
| auth_roles_negative.cy.js | Vendor->Admin, Customer->Admin, Admin->Vendor, Customer->Vendor, Vendor->Customer (5) | Redirect policy holds | Nightly | 3.0–3.5s |
| auth_roles_extended_admin.cy.js | Global Admin, Country Admin (2) | Extended admin variants only | Nightly (low churn) | 1.2–1.6s |

### Refactor Tactics
- Replace UI visits + asserts with a param-driven helper:
  ```js
  function expectAccess(role, path, { shouldRedirectTo, expectTestId }) {
    cy.login(role);
    cy.visit(path);
    if (shouldRedirectTo) {
      cy.location('pathname').should('eq', shouldRedirectTo);
    }
    cy.get(expectTestId, { timeout: 8000 }).should('exist').and('be.visible');
  }
  ```
- Drive matrix from data arrays -> iterate instead of separate `it` blocks (reduces describe overhead). In smoke shard keep only 3 positive roles.
- Seed users ONCE in `before()`.
- Consider API-only access check variant: call each path with `cy.request({ failOnStatusCode:false })` for faster policy validation (nightly).

### Inclusion Decision
Keep OUT of smoke initially; evaluate positive shard after timing optimization & verifying uniqueness vs existing dashboard coverage.

---
## Tagging & Governance Conventions
- Nightly-only specs: add `@nightly @heavy` and exclude via CI smoke filter.
- Split shards: add `@shard:auth-positive`, `@shard:auth-negative`, etc.
- Persistence and resilience tests: tag `@resilience @nightly`.
- Add matrix summary to `smoke-governance-summary.json` (future enhancement: track cumulative excluded heavy runtime vs included runtime).

---
## Threshold / Override Suggestions (Post-Split)
| Spec | Proposed Abs Threshold (ms) | Rationale |
|------|-----------------------------|-----------|
| customer_register_and_checkout.cy.js | 4000 | Initial inclusion buffer, tighten to 3500 after stability |
| auth_roles_positive.cy.js | 3000 | Encourages keeping minimal assertions |
| adminOrdersBulkDialogs_smoke.cy.js (if Option B) | 2500 | Dialog path should remain lightweight |

(Implement via future `overrides` block in `curated-smoke.json`):
```jsonc
"overrides": {
  "customer_register_and_checkout.cy.js": { "perSpecAbsMs": 4000 }
}
```

---
## Action Checklist
- [ ] Decide Option A vs B for bulk dialogs.
- [x] Extract & implement `customer_register_and_checkout.cy.js` (stub payment + analytics placeholder).
- [ ] Move persistence/login negative tests to nightly with tags.
- [x] Split `auth_roles.cy.js` into shards; legacy spec tagged @nightly @legacy.
- [x] Add tagging & update documentation (`e2e-smoke-optimization.md` pending capture run entries).
- [ ] Run capture script on new shards (3 loops) to validate medians.
- [ ] Introduce `overrides` support in orchestrator (if not yet implemented) for per-spec thresholds.
- [ ] Revisit curated list after two green PR cycles with new candidate timings.

---
## Risk Mitigation
- Ensure no net loss of coverage: maintain nightly matrix + one UI registration test.
- Prevent drift: governance warns if new shards exceed proposed thresholds.
- Avoid duplication: verify frictionless vs register+checkout overlap; keep only unique assertions (registration form, auth cookie, post-checkout auth state).

---
Prepared for Tier 3–4 planning and future PR smoke evolution.

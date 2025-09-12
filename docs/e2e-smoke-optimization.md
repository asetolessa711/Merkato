# E2E Smoke Optimization Notes (Phase 2 Preparation)

Purpose: Reduce runtime & flake risk for candidate specs before considering inclusion in curated PR smoke. Focus on deterministic speed-ups without sacrificing critical assertions.

## Current Baseline
Curated (7 specs) total ~19s wall time (run 2025-09-12). Budget: 180s (ample headroom; keep <60s preferred, <30s ideal). Candidate heavy specs must target <4s median each post-optimization for smoke eligibility.

## Target Specs & Actions

### 1. `customer_checkout.cy.js` (Median ~5700ms pre-optimization)
Goal: Bring to ≤3500ms.

Proposed Optimizations:
- Network Stubbing:
  - Intercept analytics (`/collect`, `/analytics/*`, Segment, GA) and respond 204 immediately.
  - Intercept upsell/cross-sell/marketing banners (e.g., `/api/marketing/*`, `/api/promotions/*`); stub deterministic minimal payload.
  - Intercept inventory/stock polling or shipping rate refresh endpoints returning cached fixture.
- Skip Non-Critical UI:
  - Use query param or `CYPRESS_TEST_MODE` env to hide lazy sections (recommend small feature flag read early in layout component).
  - Disable client-side animation durations (set `window.__DISABLE_ANIM= true` then CSS override: `* { transition: none !important; animation: none !important; }`).
- Reduce Waits:
  - Replace any fixed `cy.wait(nnnn)` with `cy.intercept` + `cy.wait(@alias)`.
  - Collapse multi-page navigation where possible (seed cart via API, land directly on `/checkout` with cart pre-populated via DB seed or REST calls).
- Data Seeding:
  - Seed order/cart contents via direct API/DB task (already using `db:seed`? Add variant seeding only needed models: users, single product, cart doc). Aim <250ms seeding.
- Payment Path Simplification:
  - Force COD path using env flag or stub payment intent endpoint to return immediate success to avoid external gateway simulation.
- Assertion Slimming:
  - Focus on critical path: product in cart -> shipping method -> payment success -> confirmation number. Remove secondary layout asserts.

Estimated Savings (rough):
- Seed minimization: ~400ms
- Removing fixed waits: 800–1200ms
- Skipping banners/analytics: 300–500ms
- Direct navigation + payment stub: 600–900ms
=> Target median improvement: 2.2–3.0s saved.

### 2. `vendor_product_upload.cy.js` (Median ~5385ms pre-optimization)
Goal: Bring to ≤3200ms.

Proposed Optimizations:
- Image Handling:
  - Replace large fixture with a 1x1 PNG (<=200 bytes) or dynamically construct Blob: `Cypress.Blob.base64StringToBlob('iVBORw0...')`.
  - Intercept `/api/uploads` (or actual upload endpoint) returning synthetic response w/ minimal metadata (id, url placeholder) — skip actual file processing.
- Skip Preview Rendering:
  - Add feature flag (env variable read in component) to bypass client-side image preview generation/canvas re-encoding.
- Network Short-Circuit:
  - Stub category/attribute dictionaries with static fixtures (avoid multiple GET round trips).
  - Intercept vendor auth/refresh cycles if redundant.
- DB/Product Seeding:
  - Pre-create vendor & baseline inventory via `cy.task('db:seed:vendorMinimal')` to skip in-test creation flows.
- Reduce Validation Passes:
  - Only assert critical fields present post-upload (title, price, status=Draft/Active, thumbnail placeholder). Drop duplicate field-level UI assertions.
- Eliminate Arbitrary Waits:
  - Replace waits with aliasing `POST /api/products` completion and UI stable element (`cy.get('[data-test=upload-complete]')`).
- Parallelizable Steps (Micro):
  - While form mounts, start stub intercepts early in `before()` to avoid race.

Estimated Savings:
- Upload stub + tiny image: 900–1200ms
- Skip preview & heavy validations: 400–600ms
- Fixture stubs (categories/attrs): 300–500ms
- Reduced waits: 600–900ms
=> Target median improvement: 2.2–3.1s saved.

## Implementation Sketches

Example analytics & banner stubs (add to `before()`):
```js
cy.intercept('POST', /analytics|collect/, { statusCode: 204, body: '' }).as('analytics');
cy.intercept('GET', /\/api\/promotions\//, { statusCode: 200, body: { banners: [] } }).as('promos');
```

Tiny image fixture generation (if no file fixture):
```js
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
cy.writeFile('cypress/fixtures/tiny.png', Cypress.Buffer.from(pngBase64, 'base64'));
```

Stub upload endpoint:
```js
cy.intercept('POST', '/api/uploads', (req) => {
  req.reply({ id: 'fake-upload-1', url: 'https://example.com/fake.png', width:1, height:1 });
}).as('upload');
```

Disable previews via env flag (in React component):
```js
if (window.Cypress && window.Cypress.env('FAST_MODE')) return null; // short-circuit heavy preview
```
Invoke with CYPRESS_FAST_MODE=1.

Alias-controlled waits replacing fixed delays:
```js
cy.intercept('POST', '/api/orders').as('createOrder');
// action triggering order creation
cy.wait('@createOrder');
```

## Acceptance Criteria for Inclusion
- Post-optimization median runtimes (3 loop sample via `capture-candidate-specs.js --spec <file> --loops 3`) show ≤3.5s each.
- Zero ABS/HEAVY warnings under current thresholds (or custom per-spec abs threshold set to 4500ms then tightened later).
- No new flaky behavior across 5 consecutive smoke trial runs.

## Governance Integration Plan
1. Optimize locally; capture timings.
2. Add spec to `curated-smoke.json` (append one at a time) with temporary relaxed per-spec threshold override if needed (e.g., 4500ms) stored in a soon-to-add `overrides` map.
3. Observe 3–5 CI runs; if stable, tighten threshold toward P95 * 1.2.
4. Update PR comment to display override delta (optional enhancement: show `absOverride` vs global).

## Additional Heavy Specs (Future Work)
- `auth_roles.cy.js` (≈16.9s median): Split into role-specific shards (`auth_roles_admin`, `auth_roles_vendor`, etc.) and centralize token seeding via task.
- `customerFlow.cy.js` (≈9.6s median): Extract cart build + checkout path subset used already by frictionless spec; consolidate overlapping assertions.
- `adminOrdersBulkDialogs.cy.js` (≈6.3s): Merge quick dialog open/close assertions into existing admin bulk spec or refactor to component-level test.

## Tracking TODOs
- [ ] Add FAST_MODE gating var in frontend bundle.
- [ ] Implement analytics/banner intercept helpers (`cypress/support/perfStubs.js`).
- [ ] Add tiny image fixture + upload stub.
- [ ] Introduce minimal seeding tasks (`db:seed:checkoutMinimal`, `db:seed:vendorMinimal`).
- [ ] Run 3-loop capture post-optimization for each target spec.
- [ ] Evaluate thresholds & decide inclusion order (likely `vendor_product_upload` then `customer_checkout`).

---
Generated: 2025-09-12

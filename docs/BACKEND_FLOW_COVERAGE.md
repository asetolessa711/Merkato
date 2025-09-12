# Backend Flow Coverage Guide

Goal: audit coverage by behavioral thread (checkout, orders, auth, vendor, admin, payments) and align with E2E tags for traceability.

## Tagging convention (aligns with Cypress tags)
- @auth — auth, sessions, tokens, permissions
- @checkout — cart -> order creation -> invoice -> confirmation
- @orders — order lifecycle: status updates, merges, invoices
- @payments — session creation, webhooks, idempotency
- @vendor — vendor dashboard, catalog, analytics endpoints
- @admin — admin management, flags, moderation, invoices

Add a tag comment at the top of each Jest describe block to mark its flow focus, e.g.:

// @checkout @orders
describe('Order Routes', () => { /*...*/ })

This enables filtered runs with new scripts:
- npm run test:flow:auth
- npm run test:flow:checkout
- npm run test:flow:orders
- npm run test:flow:payments
- npm run test:flow:vendor
- npm run test:flow:admin

Each writes coverage to backend/coverage/<flow>/.

## Flow map (routes -> flows)
- Auth: /api/auth/* (login, register, me), middleware/authMiddleware.js (@auth)
- Checkout: /api/cart, /api/orders (POST), /api/invoices (GET/email), /api/payments/session (@checkout @payments)
- Orders: /api/orders (GET/PUT), adminOrders.js bulk/status, invoiceRoutes.js (@orders @admin)
- Payments: paymentsRoutes.js (health, session, webhook) (@payments)
- Vendor: vendorRoutes.js, vendorPromoRoutes.js (@vendor)
- Admin: adminRoutes.js, adminOrders.js, reviewModerationRoutes.js, flags, feature-flags (@admin)

## Prioritization (risk x frequency)
1) Payments & Checkout (@payments @checkout)
   - Money, idempotency, regressions impact trust
   - Add tests for: duplicate session keys, malformed payloads, currency mismatches
2) Auth & Permissions (@auth)
   - Role leaks, missing 403/401 paths
   - Add tests for: mixed roles (global_admin, country_admin), missing tokens, expired tokens
3) Orders lifecycle (@orders)
   - State transitions, vendor vs admin capabilities
    - Add tests for: invalid transitions, unauthorized updates, empty carts
    - Current rules enforced:
       - Global order transitions: pending → paid/cancelled; paid → shipped/cancelled; shipped → delivered; terminal: delivered/cancelled.
       - Vendor transitions (section-level): pending → shipped; shipped → delivered; vendor cannot change payment states.
       - Vendor can ship only when global order is paid.
       - Only the buyer may pay; paying a cancelled or already-paid order yields 409.
    - Covered tests:
       - Non-owner cannot pay; double-pay returns 409; cancelled order pay returns 409.
       - Invalid status value returns 400; delivered → pending returns 400.
       - Vendor cannot ship before paid; happy path: admin marks paid, vendor ships then delivers.
4) Admin management (@admin)
   - Bulk actions, moderation correctness
   - Add tests for: invalid CSVs, pagination, filters, permissions
5) Vendor operations (@vendor)
   - Product updates, analytics endpoints
   - Add tests for: invalid product updates, unauthorized access

## How to use
- Start adding tags in existing suites (no behavior change). Example:

// @payments
describe('Payments Routes', () => { ... })

- Run a flow audit:

npm run test:flow:checkout
npm run test:flow:payments

- Inspect coverage in backend/coverage/<flow>/index.html (Jest lcov output).

## Gaps to consider
- Refunds: no refund routes detected — decide process, add routes and tests (@refund)
- Rate limiting & abuse: add negative tests for rate-limit behavior (@auth)
- Email failures: simulate transporter failures across flows (@admin @orders)
- Feature flags altering behavior: add tests per flag permutation (@admin)

## CI suggestion
- Matrix job per flow script, upload coverage artifacts per flow.
- Gate: raise thresholds gradually per flow once stable.

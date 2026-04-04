# Purchase/order creation stabilization (server-first)

Goal
- Stabilize purchase and order creation to a narrow, trust-critical boundary without widening process or scope.

Scope (strict)
- Validate backend order-creation contract for cart-based checkout payloads.
- Ensure server-side total integrity checks for submitted order amounts.
- Allow both guest customer checkout and registered customer checkout through the same core commerce path.
- Enforce the same order-creation eligibility, pricing, discount, and total-validation rules for both guest and registered checkout.
- Limit differences to identity/account handling and post-purchase convenience only.
- Add focused test coverage in this sequence:
  1. backend unit/contract
  2. frontend unit
  3. backend integration
  4. frontend integration
  5. one narrow trust-critical E2E anchor

Trust-critical E2E anchor (single path)
1. Seed in-stock purchasable product.
2. Customer logs in.
3. Customer adds product to cart.
4. Customer submits checkout (COD path).
5. Order creation succeeds with persisted order id.
6. Customer sees created order in account orders.

Acceptance criteria
- Backend rejects malformed or unauthorized order creation requests with clear status/message.
- Guest customer checkout is allowed.
- Registered customer checkout is allowed.
- Guest and registered customer checkout share the same core commerce validation rules.
- Manual client discount injection is blocked unless valid promo context exists.
- Client-provided totals must match server-calculated totals.
- Money normalization rules are enforced server-side for both guest and registered checkout.
- Backend creates order records with stable shape used by customer order surfaces.
- Frontend checkout and order confirmation surfaces consume the contract without runtime crashes.
- Focused backend and frontend tests for purchase/order creation are deterministic and passing.
- Single E2E anchor above passes in CI.

Out of scope
- Payments expansion beyond current checkout path contract.
- Promotion, loyalty, and analytics redesign.
- Broad checkout UX redesign.
- Governance policy changes.

Likely files
- backend/routes/orderRoutes.js
- backend/models/Order.js
- backend/tests/unit/*.test.js
- backend/tests/integration/orderRoutes*.test.js
- frontend/src/pages/CheckoutPage.js
- frontend/src/pages/CustomerOrders.js
- frontend/src/__tests__/unit/**/*.test.js
- frontend/src/__tests__/integration/**/*.test.js
- frontend/cypress/e2e/*order*creation*.cy.js

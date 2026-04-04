# Returns/refunds backend lifecycle (server-first)

Goal
- Implement a narrow, trust-critical return/refund lifecycle contract on the server with one anchor end-to-end workflow.

Scope (strict)
- Persist return/refund lifecycle records linked to an order.
- Enforce lifecycle transitions server-side.
- Block invalid transitions with explicit errors.
- Restrict retrieval and transitions to authorized actors.
- Add focused backend lifecycle tests.
- Add one narrow E2E workflow proving the contract through intended surfaces.

Lifecycle states (slice minimum)
- requested
- under_review
- approved
- rejected
- refunded
- closed

Single E2E story (exact)
- Customer requests return for an existing order from account orders.
- Admin reviewer can see the request in the intended review surface.
- Admin transitions lifecycle to approved, then refunded.
- Customer-visible order return/refund status reflects refunded.

Acceptance criteria
- Persistence: lifecycle records are saved and linked to orders.
- Transition validation: only allowed transitions succeed.
- Invalid transitions: blocked with 400 response and clear message.
- Authorization: actor access is enforced for create/read/transition.
- Retrieval: customer sees own records; admin can review records.
- Tests: focused backend lifecycle tests cover happy path + invalid + unauthorized.
- E2E: single anchor story passes in CI.

Out of scope
- chat/dispute negotiation
- notifications system
- analytics/reporting expansion
- broad UI polish
- payout reconciliation beyond minimum refunded-state contract

Likely files
- backend/models/Order.js
- backend/models/ReturnRequest.js
- backend/routes/orderRoutes.js
- backend/routes/adminOrders.js
- backend/server.js
- backend/tests/integration/orderRoutes.test.js
- backend/tests/integration/returnsRefundLifecycle.test.js
- frontend/src/pages/CustomerOrders.js
- frontend/src/pages/AdminOrders.js
- frontend/cypress/e2e/returns_refunds_flow.cy.js
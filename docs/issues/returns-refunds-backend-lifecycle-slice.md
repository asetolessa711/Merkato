# Returns/refunds backend lifecycle (server-first)

Goal
- Implement a narrow, trust-critical return/refund lifecycle contract on the server with one anchor end-to-end workflow.

Scope (strict)
- Persist return/refund lifecycle records in a dedicated `ReturnRequest` model linked to an order.
- Enforce lifecycle transitions server-side.
- Block invalid transitions with explicit errors.
- Restrict retrieval and transitions to authorized actors.
- Add focused backend lifecycle tests.
- Add one narrow E2E workflow proving the contract through intended surfaces.

Lifecycle transition map (explicit)
- requested -> under_review
- under_review -> approved
- under_review -> rejected
- approved -> refunded
- refunded -> closed
- rejected -> closed
- Any transition outside this map must return 400 with a clear error.

Source of truth
- `ReturnRequest` is lifecycle state source of truth.
- `Order` may hold only minimal summary/reference fields if strictly needed for surface rendering.

Actor permissions (slice default)
- customer: create + read own return requests
- admin: review + transition lifecycle states
- vendor: excluded for this slice unless required by proof-path implementation

UI scope (minimal)
- customer request submission/view
- admin review/transition
- customer final-state visibility
- Out of scope for this slice: broader order-management or UX redesign

Lifecycle states (slice minimum)
- requested
- under_review
- approved
- rejected
- refunded
- closed

Single E2E story (exact)
- Seeded eligible order exists.
- Customer requests return for that order from account orders.
- Admin sees the same request in review surface.
- Admin transitions requested -> under_review -> approved -> refunded.
- Customer refreshes and sees final refunded state.

Acceptance criteria
- Persistence: lifecycle records are saved in `ReturnRequest` and linked to orders.
- Transition validation: only allowed transitions from the explicit map succeed.
- Invalid transitions: blocked with 400 response and clear message.
- Authorization: actor access follows explicit slice permissions for customer/admin/vendor.
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
- backend/models/ReturnRequest.js
- backend/models/Order.js
- backend/routes/orderRoutes.js
- backend/routes/adminOrders.js
- backend/server.js
- backend/tests/integration/orderRoutes.test.js
- backend/tests/integration/returnsRefundLifecycle.test.js
- frontend/src/pages/CustomerOrders.js
- frontend/src/pages/AdminOrders.js
- frontend/cypress/e2e/returns_refunds_flow.cy.js
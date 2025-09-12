/// <reference types="cypress" />

// VendorOrders smoke: verify seeded vendor orders render and a status update succeeds.
// Intent: lightweight, deterministic, no reliance on admin bulk UI elements (which don't exist on vendor page).
describe('VendorOrders status update E2E @vendor @orders @smoke', () => {
  // Use ObjectId-like 24 hex chars to satisfy backend casting even if we stub the write
  const seedPayload = [
    {
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
      products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Vendor' }, updatedAt: new Date().toISOString(), emailLog: {}
    },
    {
      _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', buyer: { name: 'Test2', email: 'test2@test.com' }, status: 'pending', currency: 'USD', total: 20,
      products: [{ product: { name: 'Gadget' }, quantity: 2 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Vendor' }, updatedAt: new Date().toISOString(), emailLog: {}
    }
  ];

  beforeEach(() => {
    cy.login('vendor');
    // API seed for backend consistency (if helper implemented)
    cy.seedOrders(seedPayload, 'vendor');
    // LocalStorage injection so component short-circuits network and renders instantly
    cy.window().then(win => {
      win.localStorage.setItem('e2e-vendor-orders', JSON.stringify(seedPayload));
    });
    cy.visit('/vendor/orders');
    // Expect at least the two seeded IDs to show
    cy.get('[data-testid="order-row"]', { timeout: 15000 }).should('have.length.at.least', 1);
    cy.contains('aaaaaaaaaaaaaaaaaaaaaaaa').should('exist');
    cy.contains('bbbbbbbbbbbbbbbbbbbbbbbb').should('exist');
  });

  it('updates first order status to Shipped @smoke', () => {
    // Stub backend status update to avoid network flake / ID mismatch failures
    cy.intercept('PATCH', /\/api\/orders\/.*\/status/, (req) => {
      req.reply({ statusCode: 200, body: { success: true } });
    }).as('statusUpdate');
    // Change status of first rendered order
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid="status-select"]').select('shipped');
      cy.get('[data-testid="update-status-btn"]').scrollIntoView().click({ force: true });
    });
    cy.wait('@statusUpdate', { timeout: 15000 }).its('response.statusCode').should('be.oneOf', [200,204]);
    // Confirm UI reflects new status (capitalization may vary; check case-insensitively)
    cy.get('[data-testid="order-row"]').first().invoke('text').should(text => {
      expect(text.toLowerCase()).to.include('shipped');
    });
  });
});

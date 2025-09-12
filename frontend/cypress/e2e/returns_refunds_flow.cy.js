// Returns/Refunds happy-path: customer requests return, admin approves, vendor marks processed
// Tags: @thread:returns-refunds
// This is a slim placeholder that asserts presence of the flow's UI affordances.

describe('↩️ Returns & Refunds happy path @refunds @smoke', () => {
  const ORDER_ID = 'retA1';
  const baseOrder = {
    _id: ORDER_ID,
    buyer: { name: 'Return Buyer', email: 'return_buyer@test.com' },
    status: 'delivered',
    currency: 'USD',
    total: 45,
    vendors: [{ products: [{ product: { name: 'Returnable Widget', vendor: { _id: '68bbbceb29bdbfc439796a20' } }, quantity: 1 }], subtotal: 45, tax: 0, shipping: 0, total: 45 }],
    shippingAddress: { country: 'USA', city: 'Dallas', fullName: 'Return Buyer' },
    updatedBy: { name: 'Admin' },
    updatedAt: new Date().toISOString(),
    emailLog: {},
  };

  it('full customer->admin->vendor return lifecycle @smoke', () => {
    // Prepare deterministic localStorage seeding BEFORE any page loads
    cy.then(() => {
      const seedArr = [baseOrder];
      window.localStorage.setItem('e2e-customer-orders', JSON.stringify(seedArr));
      window.localStorage.setItem('e2e-orders', JSON.stringify(seedArr));
      window.localStorage.setItem('e2e-vendor-orders', JSON.stringify(seedArr));
    });

    // Customer request
    cy.login('customer');
    cy.visit('/account/orders');
    cy.get(`[data-testid="request-return-btn-${ORDER_ID}"]`, { timeout: 10000 })
      .scrollIntoView()
      .should('exist')
      .click({ force: true });
    cy.get(`[data-testid="return-status-${ORDER_ID}"]`).should('contain.text', 'Return Requested');

    // Admin approve (re-inject status for admin page if needed)
    cy.then(() => {
      const approved = [{ ...baseOrder, returnStatus: 'requested' }];
      window.localStorage.setItem('e2e-orders', JSON.stringify(approved));
    });
    cy.login('admin');
    cy.visit('/admin/orders');
    cy.get(`[data-testid="approve-return-btn-${ORDER_ID}"]`, { timeout: 10000 })
      .scrollIntoView()
      .should('exist')
      .click({ force: true });
    cy.get(`[data-testid="return-status-${ORDER_ID}"]`).should('contain.text', 'Return Approved');

    // Vendor process (inject approved state for vendor page)
    cy.then(() => {
      const processedSeed = [{ ...baseOrder, returnStatus: 'approved' }];
      window.localStorage.setItem('e2e-vendor-orders', JSON.stringify(processedSeed));
    });
    cy.login('vendor');
    cy.visit('/vendor/orders');
    cy.get(`[data-testid="process-return-btn-${ORDER_ID}"]`, { timeout: 10000 })
      .scrollIntoView()
      .should('exist')
      .click({ force: true });
    cy.get(`[data-testid="return-status-${ORDER_ID}"]`).should('contain.text', 'Return Processed');
  });
});

// PayPal approval flow: stubs approval and asserts order payload includes approvalId
describe('PayPal Approval Checkout', () => {
  it('creates paypal approval and includes approvalId in order', () => {
    cy.intercept('GET', '/api/payments/methods', {
      body: { methods: [
        { code: 'cod', displayName: 'Cash on Delivery' },
        { code: 'paypal', type: 'wallet', requiresArtifact: true, artifactKeys: ['approvalId'], displayName: 'PayPal' }
      ]}
    }).as('methods');
    cy.intercept('POST', '/api/payments/intent', (req) => {
      expect(req.body.method).to.eq('paypal');
      req.reply({ approvalId: 'paypal_123', approvalUrl: 'https://paypal.test/approve/123' });
    }).as('intent');

    let orderSeen = false;
    cy.intercept('POST', '/api/orders', (req) => {
      expect(req.body.paymentMethod).to.eq('paypal');
      expect(req.body.approvalId).to.exist;
      // Unified customer: ensure buyerInfo is included for non-auth
      expect(req.body.buyerInfo).to.exist;
      orderSeen = true;
      req.reply({ success: true, message: 'Order placed', order: { _id: 'o2' } });
    }).as('order');

    cy.visit('/shop');
    cy.contains('Cypress Test Product').click();
    cy.get('[data-testid="add-to-cart-btn"]').click();
    cy.get('[data-testid="cart-link"]').click();
    cy.get('[data-testid="checkout-btn"]').click();

    cy.wait('@methods');
    cy.contains('PayPal').click();

    cy.get('input[name=name]').clear().type('Buyer Two');
    cy.get('input[name=email]').clear().type('buyer2@example.com');
    cy.get('input[name=address]').clear().type('456 Road');
    cy.get('input[name=city]').clear().type('Ville');
    cy.get('input[name=postalCode]').clear().type('54321');
    cy.get('input[name=country]').clear().type('US');

    cy.get('[data-testid="submit-order-btn"]').click();
    cy.wait('@intent');
    cy.wait('@order');
    cy.wrap(null).should(() => expect(orderSeen).to.eq(true));
    cy.get('[data-testid="order-confirm-msg"]').should('contain', 'Thank you');
  });
});


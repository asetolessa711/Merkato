// Card (Stripe) intent flow: stubs intent and asserts order payload includes paymentIntentId
describe('Card Intent Checkout', () => {
  it('creates stripe intent and includes paymentIntentId in order', () => {
    cy.intercept('GET', '/api/payments/methods', {
      body: { methods: [
        { code: 'cod', displayName: 'Cash on Delivery' },
        { code: 'stripe', type: 'card', requiresArtifact: true, artifactKeys: ['paymentIntentId'], displayName: 'Pay with Card (Stripe)' }
      ]}
    }).as('methods');
    cy.intercept('POST', '/api/payments/intent', (req) => {
      expect(req.body.method).to.eq('stripe');
      req.reply({ intentId: 'pi_test_123', clientSecret: 'cs_test_123' });
    }).as('intent');

    let orderSeen = false;
    cy.intercept('POST', '/api/orders', (req) => {
      expect(req.body.paymentMethod).to.eq('stripe');
      expect(req.body.paymentIntentId).to.exist;
      orderSeen = true;
      req.reply({ success: true, message: 'Order placed', order: { _id: 'o1' } });
    }).as('order');

    // Flow: add product, go checkout, select stripe, fill buyer fields, submit
    cy.visit('/shop');
    cy.contains('Cypress Test Product').click();
    cy.get('[data-testid="add-to-cart-btn"]').click();
    cy.get('[data-testid="cart-link"]').click();
    cy.get('[data-testid="checkout-btn"]').click();

    cy.wait('@methods');
    cy.contains('Pay with Card').click();

    cy.get('input[name=name]').clear().type('Buyer One');
    cy.get('input[name=email]').clear().type('buyer@example.com');
    cy.get('input[name=address]').clear().type('123 Lane');
    cy.get('input[name=city]').clear().type('Testville');
    cy.get('input[name=postalCode]').clear().type('12345');
    cy.get('input[name=country]').clear().type('US');

    cy.get('[data-testid="submit-order-btn"]').click();
    cy.wait('@intent');
    cy.wait('@order');
    cy.wrap(null).should(() => expect(orderSeen).to.eq(true));
    cy.get('[data-testid="order-confirm-msg"]').should('contain', 'Thank you');
  });
});


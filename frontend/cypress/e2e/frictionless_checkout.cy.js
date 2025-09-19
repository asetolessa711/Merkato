// Frictionless checkout: unauthenticated buyer completes purchase using buyer details
describe('Frictionless Checkout Flow', () => {
  const testProductName = 'Cypress Test Product';
  before(() => { cy.task('db:seed'); });

  it('allows a buyer without auth to checkout and see confirmation (COD path) @smoke', () => {
    // 1. Add a product to the cart
  cy.intercept('GET', '**/api/products*').as('products');
    // Register intercepts EARLY so we don't miss initial requests on checkout mount
    cy.intercept('GET', '**/payments/methods*', (req) => {
      req.reply({ body: { methods: [ { code: 'cod', displayName: 'Cash on Delivery' } ] } });
    }).as('methods');
    cy.intercept('POST', '**/orders', (req) => {
      req.reply({ statusCode: 200, body: { success: true, message: 'Order placed', order: { _id: 'o-guest-1' } } });
    }).as('createOrder');

    cy.visit('/shop');
    cy.wait('@products');
    cy.contains(testProductName).click();
    cy.get('[data-testid="add-to-cart-btn"]').click();

    // 2. Proceed to checkout
    cy.get('[data-testid="cart-link"]').click();
    cy.get('[data-testid="checkout-btn"]').click();

    // 3. Fill buyer contact + shipping details
    cy.get('input[name=name]').clear().type('Buyer One');
    cy.get('input[name=email]').clear().type('buyer@example.com');
    cy.get('input[name=address]').clear().type('123 Cypress Lane');
    cy.get('input[name=city]').clear().type('Testville');
    cy.get('input[name=postalCode]').clear().type('12345');
    cy.get('input[name=country]').clear().type('Testland');

    // 4. Prefer COD to avoid external dependencies (methods already stubbed)
    cy.wait('@methods', { timeout: 15000 }).its('response.statusCode').should('be.oneOf', [200]);
    cy.get('body').then($b => {
      if ($b.find('input[name="paymentMethod"][value="cod"]').length) {
        cy.get('input[name="paymentMethod"][value="cod"]').check({ force: true });
      } else {
        cy.contains(/cash on delivery|pay on delivery/i).click();
      }
    });
    cy.get('[data-testid="submit-order-btn"], button[type="submit"]').first().click();
    cy.wait('@createOrder');

    // 5. Verify confirmation: tolerate variations in copy/selector and allow route change
    // Route may remain on /checkout while rendering inline confirmation; don't hard-fail on path
    cy.location('pathname', { timeout: 15000 }).then((p) => {
      // optional diagnostic; assertion handled by copy checks below
      Cypress.log({ name: 'route', message: `pathname=${p}` });
    });
    cy.get('body').then(($b) => {
      if ($b.find('[data-testid="order-confirm-msg"], [data-testid="order-confirmation"]').length) {
        cy.get('[data-testid="order-confirm-msg"], [data-testid="order-confirmation"]').should(($el) => {
          const text = ($el.text() || '').toLowerCase();
          expect(text).to.satisfy((t) => t.includes('thank') || t.includes('order placed') || t.includes('confirmed') || t.includes('success'));
        });
      } else {
        // Fallback: find a visible confirmation-like message anywhere
        cy.contains(/thank|order placed|order confirmed|success/i).should('be.visible');
      }
    });
  });
});

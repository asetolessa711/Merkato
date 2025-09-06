// Frictionless checkout: unauthenticated buyer completes purchase using buyer details
describe('Frictionless Checkout Flow', () => {
  const testProductName = 'Cypress Test Product';
  before(() => { cy.task('db:seed'); });

  it('allows a buyer without auth to checkout and see confirmation', () => {
    // 1. Add a product to the cart
    cy.intercept('GET', '/api/products*').as('products');
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

    // 4. Submit the order
    cy.intercept('POST', '/api/orders').as('createOrder');
    cy.get('[data-testid="submit-order-btn"]').click();
    cy.wait('@createOrder');

    // 5. Verify confirmation message
    cy.get('[data-testid="order-confirm-msg"]').should('contain', 'Thank you').and('contain', 'order');
  });
});

// Checkout + Payment (Customer)
describe('Customer Checkout and Payment', () => {
  before(() => { cy.task('db:seed'); });
  it('should allow a customer to checkout and pay', () => {
    cy.login('customer');
    cy.visit('/');
    cy.get('[data-testid="add-to-cart-btn"]').first().click();
    cy.get('[data-testid="cart-link"]').click();
    cy.get('[data-testid="checkout-btn"]').click();
    cy.get('input[name="shippingAddress.fullName"]').type('Test User');
    cy.get('input[name="shippingAddress.city"]').type('Test City');
    cy.get('input[name="shippingAddress.country"]').type('Testland');
    // Select card method (stripe)
    cy.get('input[name="paymentMethod"]').check('stripe', { force: true });
    cy.intercept('POST', '/api/orders').as('createOrder');
    cy.get('button[type="submit"]').click();
    cy.wait('@createOrder');
    cy.get('[data-testid="order-confirm-msg"]').should('contain', 'Thank you');
  });
});

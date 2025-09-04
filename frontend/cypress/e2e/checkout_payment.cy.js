// Checkout + Payment (Customer)
describe('Customer Checkout and Payment', () => {
  it('should allow a customer to checkout and pay', () => {
    cy.login('customer');
    cy.visit('/');
    cy.get('[data-testid="add-to-cart-btn"]').first().click();
    cy.get('[data-testid="cart-link"]').click();
    cy.get('[data-testid="checkout-btn"]').click();
    cy.get('input[name="shippingAddress.fullName"]').type('Test User');
    cy.get('input[name="shippingAddress.city"]').type('Test City');
    cy.get('input[name="shippingAddress.country"]').type('Testland');
    cy.get('input[name="paymentMethod"]').check('card');
    cy.get('button[type="submit"]').click();
    cy.contains('Order placed successfully').should('exist');
  });
});

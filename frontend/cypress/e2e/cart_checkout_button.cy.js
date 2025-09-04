// Add to cart then ensure checkout button is present in cart
describe('🛒 Cart Checkout Button', () => {
  const productName = 'Cypress Test Product';

  it('shows checkout button after adding product', () => {
    cy.visit('/shop');
    cy.contains(productName, { timeout: 10000 }).should('exist');
    cy.contains(productName)
      .closest('[data-testid="product-card"]')
      .within(() => {
        cy.get('[data-testid="add-to-cart-btn"]').click({ force: true });
      });
    cy.get('[data-testid="cart-link"]').click();
    cy.get('[data-testid="checkout-btn"]').should('be.visible');
  });
});


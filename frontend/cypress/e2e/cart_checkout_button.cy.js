// Add to cart then ensure checkout button is present in cart
describe('🛒 Cart Checkout Button', () => {
  const productName = 'Cypress Test Product';

  before(() => {
    cy.task('db:seed');
  });

  it('shows checkout button after adding product', () => {
    cy.intercept('GET', '/api/products*').as('products');
    cy.visit('/shop');
    cy.wait('@products');
    cy.contains(productName, { timeout: 15000 }).should('exist');
    cy.contains(productName)
      .closest('[data-testid="product-card"]')
      .within(() => {
        cy.get('[data-testid="add-to-cart-btn"]').click({ force: true });
      });
    cy.get('[data-testid="cart-link"]').click();
    cy.get('[data-testid="checkout-btn"]').should('be.visible');
  });
});

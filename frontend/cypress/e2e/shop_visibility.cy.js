// Shop page should show seeded product and allow add-to-cart
describe('🛍️ Shop Visibility', () => {
  const productName = 'Cypress Test Product';

  before(() => {
    // Ensure the canonical product exists
    cy.task('db:seed');
  });

  it('shows test product and adds to cart', () => {
    cy.intercept('GET', '/api/products*').as('products');
    cy.visit('/shop');
    cy.wait('@products');
    cy.contains(productName, { timeout: 15000 }).should('exist');
    cy.contains(productName)
      .closest('[data-testid="product-card"]')
      .within(() => {
        cy.get('[data-testid="add-to-cart-btn"]').click({ force: true });
      });
  });
});

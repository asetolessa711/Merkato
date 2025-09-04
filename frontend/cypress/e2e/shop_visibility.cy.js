// Shop page should show seeded product and allow add-to-cart
describe('🛍️ Shop Visibility', () => {
  const productName = 'Cypress Test Product';

  it('shows test product and adds to cart', () => {
    cy.visit('/shop');
    cy.contains(productName, { timeout: 10000 }).should('exist');
    cy.contains(productName)
      .closest('[data-testid="product-card"]')
      .within(() => {
        cy.get('[data-testid="add-to-cart-btn"]').click({ force: true });
      });
  });
});


// Basic navigation smoke
describe('🌐 Basic Navigation', () => {
  it('shows navbar and navigates to cart', () => {
    cy.visit('/');
    cy.get('[data-testid="navbar"]', { timeout: 10000 }).should('be.visible');
    cy.contains('Shop').should('be.visible');
    cy.get('[data-testid="cart-link"]').should('be.visible').click();
    cy.location('pathname').should('eq', '/cart');
  });
});


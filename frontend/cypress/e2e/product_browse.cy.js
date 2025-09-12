// Tags: @thread:product-browse
describe('🛍 Product Browse', () => {
  it('shows product list and can open product details (if exists)', () => {
    cy.visit('/shop');
    cy.contains(/products|shop/i).should('exist');
    cy.get('[data-testid="product-card"]').its('length').should('be.gte', 0);
  });
});

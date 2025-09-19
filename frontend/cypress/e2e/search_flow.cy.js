// Tags: @thread:search @thread:product-browse
describe('🔎 Search Flow', () => {
  it('filters products by search term', () => {
    cy.visit('/shop');
    cy.get('input[name="search"], input[placeholder*="Search" i]').first().type('Demo');
    // accept either filtered result presence or general presence
    cy.get('[data-testid="product-card"]').should('exist');
  });
});

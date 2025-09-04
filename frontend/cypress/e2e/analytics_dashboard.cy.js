// Analytics Charts Render (Vendor)
describe('Vendor Analytics Dashboard', () => {
  it('should render analytics charts for vendor', () => {
    cy.login('vendor');
    cy.visit('/vendor/analytics');
    cy.get('[data-testid="analytics-chart"]').should('exist');
    cy.get('[data-testid="analytics-chart"]').should('be.visible');
  });
});

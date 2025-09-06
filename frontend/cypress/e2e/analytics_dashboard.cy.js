// Analytics Charts Render (Vendor)
describe('Vendor Analytics Dashboard', () => {
  it('should render analytics charts for vendor', () => {
    cy.login('vendor');
  // Align intercepts with actual endpoints used by VendorAnalytics.js
  cy.intercept('GET', '**/api/orders/vendor/analytics*').as('vendorAnalytics');
  cy.intercept('GET', '**/api/orders/vendor/sales*').as('vendorSales');
  cy.intercept('GET', '**/api/vendor/top-products*').as('vendorTopProducts');
  cy.intercept('GET', '**/api/vendor/top-customers*').as('vendorTopCustomers');
    cy.visit('/vendor/analytics');
  cy.wait(['@vendorAnalytics', '@vendorSales', '@vendorTopProducts', '@vendorTopCustomers']);
    cy.get('[data-testid="analytics-chart"]').should('exist').and('be.visible');
  });
});

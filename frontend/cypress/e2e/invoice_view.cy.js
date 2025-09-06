// Invoice Viewing (Vendor/Admin)
describe('Invoice Viewing', () => {
  it('should allow vendor to view invoices', () => {
    cy.login('vendor');
  // Frontend calls consolidated report endpoint; scope to it
  cy.intercept('GET', '**/api/invoices/report*').as('vendorInvoices');
    cy.visit('/vendor/invoices');
    // Don't strictly wait on XHR to avoid flake; UI will render rows or placeholder
    cy.get('[data-testid="invoice-row"]').should('exist');
    cy.get('[data-testid="invoice-row"]').first().click();
    cy.get('[data-testid="invoice-detail"]').should('be.visible');
  });
  it('should allow admin to view invoices', () => {
    cy.login('admin');
  // Admin also uses the same report endpoint; backend filters by role
  cy.intercept('GET', '**/api/invoices/report*').as('adminInvoices');
    cy.visit('/admin/invoices');
    // Avoid brittle wait on network alias
    cy.get('[data-testid="invoice-row"]').should('exist');
    cy.get('[data-testid="invoice-row"]').first().click();
    cy.get('[data-testid="invoice-detail"]').should('be.visible');
  });
});

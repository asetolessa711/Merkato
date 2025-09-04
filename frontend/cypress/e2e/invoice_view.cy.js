// Invoice Viewing (Vendor/Admin)
describe('Invoice Viewing', () => {
  it('should allow vendor to view invoices', () => {
    cy.login('vendor');
    cy.visit('/vendor/invoices');
    cy.get('[data-testid="invoice-row"]').should('exist');
    cy.get('[data-testid="invoice-row"]').first().click();
    cy.get('[data-testid="invoice-detail"]').should('be.visible');
  });
  it('should allow admin to view invoices', () => {
    cy.login('admin');
    cy.visit('/admin/invoices');
    cy.get('[data-testid="invoice-row"]').should('exist');
    cy.get('[data-testid="invoice-row"]').first().click();
    cy.get('[data-testid="invoice-detail"]').should('be.visible');
  });
});

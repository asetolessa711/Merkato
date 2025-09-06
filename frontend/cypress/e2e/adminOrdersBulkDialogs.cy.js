/// <reference types="cypress" />

describe('AdminOrders Bulk Dialogs E2E', () => {
  beforeEach(() => {
  cy.loginAsAdmin();
  cy.visit('/admin/orders');
    // Seed test orders via API or fixture if needed
    cy.seedOrders([
      {
        _id: '1', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date().toISOString(), emailLog: {}
      }
    ]);
  });

  it('shows bulk export dialog after preview confirmation', () => {
  cy.get('input[type="checkbox"]').check({ force: true });
    cy.contains('Export Selected').click();
    cy.get('[data-testid="bulk-preview-header"]').should('be.visible');
    cy.contains('Confirm').click();
    cy.get('[data-testid="bulk-export-header"]').should('be.visible');
    cy.contains('Confirm & Export').click();
    cy.contains('Bulk Action Summary').should('be.visible');
  });

  it('shows bulk email preview dialog after preview confirmation', () => {
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.contains('Resend Emails').click();
    cy.get('[data-testid="bulk-preview-header"]').should('be.visible');
    cy.contains('Confirm').click();
    cy.get('[data-testid="bulk-email-preview-header"]').should('be.visible');
    cy.contains('Confirm & Resend').click();
    cy.contains('Bulk Action Summary').should('be.visible');
  });
});

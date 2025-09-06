/// <reference types="cypress" />

describe('AdminOrders Bulk Actions E2E', () => {
  beforeEach(() => {
  cy.loginAsAdmin();
  cy.visit('/admin/orders');
  cy.seedOrders([
      {
        _id: '1', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
        products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date().toISOString(), emailLog: {}
      },
      {
        _id: '2', buyer: { name: 'Test2', email: 'test2@test.com' }, status: 'pending', currency: 'USD', total: 20,
        products: [{ product: { name: 'Gadget' }, quantity: 2 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date().toISOString(), emailLog: {}
      }
    ]);
  });

  it('performs bulk status change and shows summary', () => {
    cy.intercept('POST', '/api/admin/orders/bulk-status').as('bulkStatus');
    cy.get('[data-testid="order-checkbox"]').check({ force: true });
    cy.contains('Mark as Shipped').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="bulk-preview-header"]').should('exist').and('be.visible');
    cy.get('[data-testid="bulk-preview-dialog"] button').contains('Confirm').scrollIntoView().should('be.visible').click();
    cy.wait('@bulkStatus');
    cy.get('[data-testid="bulk-action-summary-header"]').should('exist').and('be.visible');
    cy.get('[data-testid="bulk-summary-failed-count"]').should('exist').and('be.visible');
    cy.get('[data-testid="bulk-action-summary-header"]').parent().should('contain.text', 'Success: 2');
  });

  it('undoes a bulk status change', () => {
    cy.intercept('POST', '/api/admin/orders/bulk-status').as('bulkStatus');
    cy.get('[data-testid="order-checkbox"]').check({ force: true });
    cy.contains('Mark as Shipped').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="bulk-preview-header"]').should('exist').and('be.visible');
    cy.get('[data-testid="bulk-preview-dialog"] button').contains('Confirm').scrollIntoView().should('be.visible').click();
    cy.wait('@bulkStatus');
    cy.get('[data-testid="undo-bulk-action"]').scrollIntoView().should('exist').and('be.visible').click();
    cy.get('[data-testid="undo-bulk-action"]').should('not.exist');
  });

  it('schedules a bulk action and shows scheduled entry', () => {
    cy.intercept('POST', '/api/admin/orders/bulk-schedule').as('bulkSchedule');
    cy.get('[data-testid="order-checkbox"]').check({ force: true });
    cy.contains('Schedule Export').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="schedule-bulk-action-header"]').should('exist').and('be.visible');
    cy.get('[data-testid="schedule-date-input"]').should('exist').type('2025-08-06T12:00');
    cy.get('[data-testid="confirm-schedule-bulk-action"]').scrollIntoView().should('be.visible').click();
    cy.wait('@bulkSchedule');
    cy.contains('Scheduled Bulk Actions').should('exist').and('be.visible');
    cy.contains('Export').should('exist').and('be.visible');
  });

  it('shows error message for failed bulk status change', () => {
    // Simulate API failure by intercepting
    cy.intercept('POST', '/api/admin/orders/bulk-status', {
      statusCode: 500,
      body: { failed: ['1', '2'] }
    });
    cy.get('[data-testid="order-checkbox"]').check({ force: true });
    cy.contains('Mark as Shipped').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="bulk-preview-header"]').should('exist').and('be.visible');
    cy.get('[data-testid="bulk-preview-dialog"] button').contains('Confirm').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="bulk-action-summary-header"]').should('exist').and('be.visible');
    cy.get('[data-testid="bulk-summary-failed-count"]').should('exist').and('contain.text', '2');
  });

  it('shows info message if not authorized for bulk actions', () => {
    cy.window().then(win => win.localStorage.setItem('adminRole', 'viewer'));
    cy.reload();
    cy.get('[data-testid="order-checkbox"]').check({ force: true });
    cy.contains('Mark as Shipped').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="bulk-action-unauthorized-info"]').should('exist').and('be.visible');
  });
});

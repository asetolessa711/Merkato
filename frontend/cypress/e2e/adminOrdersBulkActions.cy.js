/// <reference types="cypress" />

// NOTE: Split: vendor-specific happy-path moved to vendorOrdersBulkActions.cy.js (@smoke). This admin suite keeps extended scenarios.
// Added @smoke so curated list aligns with tag audit (lightweight core bulk paths kept fast)
describe('AdminOrders Bulk Actions E2E @admin @orders @smoke', () => {
  const seedPayload = [
    {
      _id: 'bulkA1', buyer: { name: 'Test', email: 'test@test.com' }, status: 'pending', currency: 'USD', total: 10,
      products: [{ product: { name: 'Widget' }, quantity: 1 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date().toISOString(), emailLog: {}
    },
    {
      _id: 'bulkA2', buyer: { name: 'Test2', email: 'test2@test.com' }, status: 'pending', currency: 'USD', total: 20,
      products: [{ product: { name: 'Gadget' }, quantity: 2 }], shippingAddress: { country: 'USA' }, updatedBy: { name: 'Admin' }, updatedAt: new Date().toISOString(), emailLog: {}
    }
  ];

  beforeEach(() => {
    cy.loginAsAdmin();
  // Seed first so localStorage fallback is ready before navigation
  cy.seedOrders(seedPayload);
  cy.visit('/admin/orders');
  // Wait for table container; data injected via localStorage short-circuits fetch
  cy.get('[data-testid="orders-table"]', { timeout: 15000 }).should('exist').and('be.visible');
    cy.get('[data-testid="order-row-bulkA1"]').should('exist');
    cy.get('[data-testid="order-row-bulkA2"]').should('exist');
  });

  it('performs bulk status change and shows summary', () => {
    cy.intercept('POST', '/api/admin/orders/bulk-status').as('bulkStatus');
  cy.get('[data-testid="order-select-all"]').check({ force: true });
    cy.get('[data-testid="bulk-action-mark-shipped"]').scrollIntoView().should('be.visible').click();
    cy.get('[data-testid="bulk-preview-dialog"]').should('exist').and('be.visible');
    cy.get('[data-testid="bulk-preview-confirm"]').scrollIntoView().should('be.visible').click();
    cy.wait('@bulkStatus').its('response.statusCode').should('eq', 200);
  cy.get('[data-testid="bulk-summary-success-count"]').should('have.text', '2');
  });

  it('undoes a bulk status change', () => {
    cy.intercept('POST', '/api/admin/orders/bulk-status').as('bulkStatus');
    cy.get('[data-testid="order-select-all"]').check({ force: true });
    cy.get('[data-testid="bulk-action-mark-shipped"]').click();
    cy.get('[data-testid="bulk-preview-dialog"]').should('exist');
    cy.get('[data-testid="bulk-preview-confirm"]').should('be.visible').click();
    cy.wait('@bulkStatus');
    cy.get('[data-testid="undo-bulk-action"]').should('exist').click();
    cy.get('[data-testid="undo-bulk-action"]').should('not.exist');
  });

  it('schedules a bulk action and shows scheduled entry', () => {
    cy.intercept('POST', '/api/admin/orders/bulk-schedule').as('bulkSchedule');
    cy.get('[data-testid="order-select-all"]').check({ force: true });
    cy.get('[data-testid="bulk-action-schedule-export"]').click();
    cy.get('[data-testid="schedule-bulk-action-dialog"]').should('exist');
    cy.get('[data-testid="schedule-date-input"]').type('2025-08-06T12:00');
    cy.get('[data-testid="confirm-schedule-bulk-action"]').click();
    cy.wait('@bulkSchedule').its('response.statusCode').should('eq', 200);
    cy.get('[data-testid="scheduled-bulk-actions-section"]').should('exist').and('be.visible');
    cy.get('[data-testid="scheduled-bulk-action-row"]:contains(Export)').should('exist');
  });

  it('shows error message for failed bulk status change', () => {
    cy.intercept('POST', '/api/admin/orders/bulk-status', {
      statusCode: 500,
      body: { failed: ['bulkA1', 'bulkA2'] }
    }).as('bulkStatusFail');
    cy.get('[data-testid="order-select-all"]').check({ force: true });
    cy.get('[data-testid="bulk-action-mark-shipped"]').click();
    cy.get('[data-testid="bulk-preview-dialog"]').should('exist');
    cy.get('[data-testid="bulk-preview-confirm"]').should('be.visible').click();
    cy.wait('@bulkStatusFail');
    cy.get('[data-testid="bulk-summary-failed-count"]').should('contain.text', '2');
  });

  it('shows info message if not authorized for bulk actions', () => {
    cy.window().then(win => win.localStorage.setItem('adminRole', 'viewer'));
    cy.reload();
    cy.get('[data-testid="orders-table"]');
    cy.get('[data-testid="order-select-all"]').check({ force: true });
    cy.get('[data-testid="bulk-action-mark-shipped"]').click();
    cy.get('[data-testid="bulk-action-unauthorized-info"]').should('exist').and('be.visible');
  });
});

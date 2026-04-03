// Admin bulk action with empty selection should show friendly error

describe('🧪 Admin bulk action - empty selection', () => {
  beforeEach(() => {
    cy.login('admin');
    cy.visit('/admin/orders');
  });

  it('shows friendly error when running bulk action without selecting orders @negative', () => {
    cy.contains(/no selection/i).should('be.visible');
    cy.get('[data-testid="bulk-action-mark-shipped"]').should('be.disabled');
  });
});

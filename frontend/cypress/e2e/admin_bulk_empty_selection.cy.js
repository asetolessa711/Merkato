// Admin bulk action with empty selection should show friendly error

describe('🧪 Admin bulk action - empty selection', () => {
  beforeEach(() => {
    cy.login('admin');
    cy.visit('/admin/orders');
  });

  it('shows friendly error when running bulk action without selecting orders @negative', () => {
    cy.contains(/Mark as Shipped|Bulk Update/i).scrollIntoView().should('be.visible').click({ force: true });
    cy.contains(/select at least one order|no orders selected|choose some orders/i, { timeout: 5000 }).should('be.visible');
  });
});

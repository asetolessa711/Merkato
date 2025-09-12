// Admin bulk action with empty selection should show friendly error

describe('🧪 Admin bulk action - empty selection', () => {
  beforeEach(() => {
    cy.login('admin');
    cy.visit('/admin/orders');
    cy.contains(/orders|manage orders|admin/i, { timeout: 10000 }).should('be.visible');
  });

  it('shows friendly error when running bulk action without selecting orders @negative', () => {
    // Try a few potential bulk action triggers
    const triggers = [/Mark as Shipped/i, /Bulk Update/i, /Bulk Actions?/i];
    cy.wrap(triggers).each((pattern) => {
      cy.contains(pattern).then(($el) => {
        if ($el && $el.length) {
          cy.wrap($el).scrollIntoView().click({ force: true });
        }
      });
    });

    cy.contains(/select at least one order|no orders selected|choose some orders/i, { timeout: 10000 }).should('be.visible');
  });
});

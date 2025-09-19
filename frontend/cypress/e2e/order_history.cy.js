// Tags: @thread:order-history
describe('📜 Order History', () => {
  it('navigates to account orders view', () => {
    cy.visit('/account/orders');
    cy.contains(/orders|order history/i).should('exist');
  });
});

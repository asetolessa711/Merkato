// Order Status Update (Admin/Vendor)
describe('Order Status Update', () => {
  it('should allow admin to update order status', () => {
    cy.login('admin');
    cy.visit('/admin/orders');
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid="status-select"]').select('Shipped');
      cy.get('[data-testid="update-status-btn"]').click();
      cy.contains('Shipped').should('exist');
    });
  });
  it('should allow vendor to update order status', () => {
    cy.login('vendor');
    cy.visit('/vendor/orders');
    cy.get('[data-testid="order-row"]').first().within(() => {
      cy.get('[data-testid="status-select"]').select('Completed');
      cy.get('[data-testid="update-status-btn"]').click();
      cy.contains('Completed').should('exist');
    });
  });
});

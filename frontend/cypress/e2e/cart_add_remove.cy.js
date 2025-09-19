// Tags: @thread:cart
describe('🧺 Cart Add/Remove Flow', () => {
  it('adds and removes an item without proceeding to checkout', () => {
    cy.visit('/');
    cy.get('[data-testid="product-card"]').first().within(()=>{
      cy.contains(/add to cart/i).click();
    });
    cy.get('[data-testid="cart-link"]').click();
    cy.url().should('include','/cart');
    // Assuming remove buttons exist with text 'Remove'
    cy.contains(/remove/i).first().click({ force: true });
    // Accept either empty state or decreased count
    cy.contains(/your cart is empty/i).should('exist');
  });
});
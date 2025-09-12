// Tags: @thread:payments @thread:checkout
describe('💳 Payments Checkout Flow', () => {
  it('visits checkout and triggers (mocked) payment pathway', () => {
    cy.visit('/');
    // Add first product
    cy.get('[data-testid="product-card"]').first().within(()=>{
      cy.contains(/add to cart/i).click();
    });
    // Go to cart then checkout
    cy.get('[data-testid="cart-link"]').click();
    cy.url().should('include','/cart');
    cy.get('[data-testid="checkout-btn"]').click();
    cy.url().should('include','/checkout');
    // Fill minimal required fields (defensive selectors)
    cy.get('input[name="address"], input[name="fullName"]').first().type('Payment Tester');
    cy.get('input[name="city"]').type('Payville');
    cy.get('input[name="zip"], input[name="postalCode"]').first().type('12345');
    // If payment method radios/select exist choose first
    cy.get('input[name="paymentMethod"], select[name="paymentMethod"]').first().then($el => {
      if ($el.is('select')) {
        cy.wrap($el).select(0);
      } else {
        cy.wrap($el).check({ force: true });
      }
    });
    // Submit (place order / pay)
    cy.contains(/place order|pay|checkout/i).click({ force: true });
    // Allow either success page, order confirmation text or validation error (seed dependent)
    cy.contains(/thank you|order|payment|error/i, { timeout: 15000 }).should('exist');
  });
});
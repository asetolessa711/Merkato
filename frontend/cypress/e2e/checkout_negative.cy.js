// Negative checkout: invalid address and missing payment should show friendly errors

describe('❌ Checkout validation errors', () => {
  const productName = 'Cypress Test Product';
  before(() => { cy.task('db:seed'); });

  it('shows errors for incomplete address and missing payment method @negative', () => {
    cy.intercept('GET', '/api/products*').as('products');
    cy.visit('/shop');
    cy.wait('@products');
    cy.contains(productName).click();
    cy.get('[data-testid="add-to-cart-btn"]').click();

    cy.get('[data-testid="cart-link"]').click();
    cy.get('[data-testid="checkout-btn"]').click();

    // Enter incomplete address and do not pick payment method
    cy.get('input[name=name]').clear().type('Bad Buyer');
    cy.get('input[name=email]').clear().type('bad@example.com');
    cy.get('input[name=address]').clear(); // leave blank
    cy.get('input[name=city]').clear();
    cy.get('input[name=postalCode]').clear();

    cy.get('[data-testid="submit-order-btn"], button[type="submit"]').first().click();

    // Expect friendly validation errors rendered
    cy.contains(/address is required|incomplete|enter your address/i).should('be.visible');
    cy.contains(/payment method is required|select a payment/i).should('be.visible');
  });
});

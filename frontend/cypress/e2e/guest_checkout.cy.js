// guest_checkout.cy.js

describe('🛒 Guest Checkout Flow', () => {
  const testProductName = 'Cypress Test Product';

  it('should allow a guest to checkout and see confirmation message', () => {
    // 1. Add a product to the cart
    cy.visit('/shop');
    cy.contains(testProductName).click();
    cy.get('[data-testid="add-to-cart-btn"]').click();

    // 2. Proceed to checkout
    cy.get('[data-testid="cart-link"]').click();
    cy.get('[data-testid="checkout-btn"]').click();

    // 3. Fill guest shipping and payment details
    cy.get('input[name=name]').type('Guest Buyer');
    cy.get('input[name=email]').type('guest@example.com');
    cy.get('input[name=address]').type('123 Cypress Lane');
    cy.get('input[name=city]').type('Testville');
    cy.get('input[name=postalCode]').type('12345');
    cy.get('input[name=country]').type('Testland');
    cy.get('input[name=cardNumber]').type('4111111111111111');
    cy.get('input[name=expiry]').type('12/30');
    cy.get('input[name=cvv]').type('123');

    // 4. Submit the order
    cy.get('[data-testid="submit-order-btn"]').click();

    // 5. Verify confirmation message for guest
    cy.get('[data-testid="order-confirm-msg"]').should('contain', 'Thank you').and('contain', 'order');

    // 6. Optionally: verify guest does not see order in account history
    cy.visit('/account/orders');
    cy.contains(testProductName).should('not.exist');
  });
});

// customer_checkout.cy.js

describe('🛒 Customer Checkout Flow', () => {
  const customerEmail = 'customer@test.com';
  const customerPassword = 'Password123!';
  const testProductName = 'Cypress Test Product';

  it('should allow a customer to checkout and see order in history', () => {
    // 1. Log in as customer
    cy.visit('/login');
    cy.get('input[name=email]').type(customerEmail);
    cy.get('input[name=password]').type(customerPassword);
    cy.get('button[type=submit]').click();

    // 2. Add a product to the cart
    cy.visit('/shop');
    cy.contains(testProductName).click();
    cy.get('[data-testid="add-to-cart-btn"]').click();

    // 3. Proceed to checkout
    cy.get('[data-testid="cart-link"]').click();
    cy.get('[data-testid="checkout-btn"]').click();

    // 4. Fill shipping and payment details
    cy.get('input[name=address]').type('123 Cypress Lane');
    cy.get('input[name=city]').type('Testville');
    cy.get('input[name=postalCode]').type('12345');
    cy.get('input[name=country]').type('Testland');
    cy.get('input[name=cardNumber]').type('4111111111111111');
    cy.get('input[name=expiry]').type('12/30');
    cy.get('input[name=cvv]').type('123');

    // 5. Submit the order
    cy.get('[data-testid="submit-order-btn"]').click();

    // 6. Verify confirmation message
    cy.get('[data-testid="order-confirm-msg"]').should('contain', 'Thank you').and('contain', 'order');

  // 7. Verify order appears in customer order history
      cy.visit('/account/orders');
      // Assert the "recently placed" banner (set on checkout success via localStorage)
      cy.get('[data-testid="recently-placed"]', { timeout: 15000 })
        .should('contain', testProductName);
      // If explicit items list exists, also verify it contains the product name
      cy.get('body').then(($b) => {
        if ($b.find('[data-testid="order-item-name"]').length) {
          cy.get('[data-testid="order-item-name"]').should('contain', testProductName);
        }
      });
  });
});

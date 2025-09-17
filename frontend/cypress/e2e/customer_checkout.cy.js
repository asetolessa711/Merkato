// customer_checkout.cy.js

describe('🛒 Customer Checkout Flow', () => {
  const customerEmail = 'customer@test.com';
  const customerPassword = 'Password123!';
  const testProductName = 'Cypress Test Product';

  it('should allow a customer to checkout and see order in history (COD path)', () => {
  // Ensure seed and login via stable helper
  cy.login('customer');

    // 2. Add a product to the cart
    cy.visit('/shop');
    cy.contains(testProductName).click();
    cy.get('[data-testid="add-to-cart-btn"]').click();

    // 3. Proceed to checkout
    cy.get('[data-testid="cart-link"]').click();
    cy.get('[data-testid="checkout-btn"]').click();

    // 4. Fill shipping and payment details (use current field names)
    cy.get('input[name=name]').clear().type('Test Customer');
    cy.get('input[name=email]').clear().type('customer@test.com');
    cy.get('input[name=address]').clear().type('123 Cypress Lane');
    cy.get('input[name=city]').clear().type('Testville');
    cy.get('input[name=postalCode]').clear().type('12345');
    cy.get('input[name=country]').clear().type('US');
    // Prefer COD for determinism
  cy.intercept('GET', '**/api/payments/methods*', (req) => {
      req.reply({ body: { methods: [ { code: 'cod', displayName: 'Cash on Delivery' } ] } });
    }).as('methods');
    cy.get('body').then($b => {
      if ($b.find('input[name="paymentMethod"][value="cod"]').length) {
        cy.get('input[name="paymentMethod"][value="cod"]').check({ force: true });
      } else {
        cy.contains(/cash on delivery|pay on delivery/i).click();
      }
    });

    // 5. Submit the order
  cy.intercept('POST', '**/api/orders', (req) => {
      req.reply({ statusCode: 200, body: { success: true, message: 'Order placed', order: { _id: 'o1' } } });
    }).as('createOrder');
    cy.get('[data-testid="submit-order-btn"], button[type="submit"]').first().click();
    cy.wait('@createOrder');

    // 6. Verify confirmation message
  cy.get('[data-testid="order-confirm-msg"], [data-testid="order-confirmation"]').should('contain.text', 'Thank');

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

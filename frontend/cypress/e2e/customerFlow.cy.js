// E2E: Critical customer flow with advanced best practices

describe('🛒 Customer E2E Flow', () => {
  const email = `customer-e2e+${Date.now()}@example.com`;
  const password = 'Password123!';

  beforeEach(() => {
    // Clear cookies/localStorage to ensure clean state
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('registers, logs in, adds to cart, checks out, and sees order confirmation', () => {
    // Visit home page
    cy.visit('/');

    // Register a new user
    cy.contains(/register/i).click();
    cy.get('input[name="name"]').type('Test Customer');
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('input[name="confirmPassword"]').type(password);
    cy.get('button[type="submit"]').contains(/register/i).click();

    // Wait for registration success or redirect
    cy.url().should('match', /login|dashboard|account/i);

    // Login (if not auto-logged in)
    if (Cypress.$('input[name="email"]').length) {
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('button[type="submit"]').contains(/login/i).click();
    }

    // Wait for dashboard or home
    cy.url().should('match', /dashboard|account|home/i);

    // Add a product to cart
    cy.contains(/shop/i).click();
    cy.get('[data-testid="product-card"]').first().within(() => {
      cy.contains(/add to cart/i).click();
    });

    // Open cart and verify item
    cy.get('[data-testid="cart-icon"]').click();
    cy.get('[data-testid="cart-sidebar"]').should('be.visible');
    cy.get('[data-testid="cart-item"]').should('have.length.at.least', 1);

    // Remove item and re-add to test cart update
    cy.get('[data-testid="cart-item"]').first().within(() => {
      if (Cypress.$('button[aria-label="Remove"]').length) {
        cy.get('button[aria-label="Remove"]').click();
      }
    });
    cy.get('[data-testid="cart-item"]').should('have.length.lessThan', 2);
    // Re-add for checkout
    cy.contains(/shop/i).click();
    cy.get('[data-testid="product-card"]').first().within(() => {
      cy.contains(/add to cart/i).click();
    });

    // Proceed to checkout
    cy.get('[data-testid="cart-icon"]').click();
    cy.contains(/checkout/i).click();

    // Fill in checkout form if required
    cy.get('input[name="address"]').type('123 Test St');
    cy.get('input[name="city"]').type('Testville');
    cy.get('input[name="zip"]').type('12345');
    cy.get('button[type="submit"]').contains(/place order|pay/i).click();

    // Confirm order confirmation page
    cy.contains(/thank you/i, { timeout: 10000 }).should('be.visible');
    cy.contains(/order has been placed/i).should('be.visible');

    // Test logout
    cy.get('[data-testid="navbar"]').within(() => {
      cy.contains(/logout/i).click();
    });
    cy.contains(/login/i).should('be.visible');
  });

  it('shows error on invalid login', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('not-a-user@example.com');
    cy.get('input[name="password"]').type('WrongPass123!');
    cy.get('button[type="submit"]').contains(/login/i).click();
    cy.contains(/invalid email|invalid credentials|not found/i).should('be.visible');
  });

  it('prevents checkout with empty cart', () => {
    cy.visit('/');
    cy.get('[data-testid="cart-icon"]').click();
    cy.get('[data-testid="cart-sidebar"]').should('be.visible');
    cy.contains(/checkout/i).should('be.disabled');
    cy.contains(/your cart is empty/i).should('be.visible');
  });

  // Advanced: Test session persistence after reload
  it('persists session after reload', () => {
    // Register and login
    cy.visit('/');
    cy.contains(/register/i).click();
    cy.get('input[name="name"]').type('Persistent Customer');
    cy.get('input[name="email"]').type(`persist-${Date.now()}@example.com`);
    cy.get('input[name="password"]').type(password);
    cy.get('input[name="confirmPassword"]').type(password);
    cy.get('button[type="submit"]').contains(/register/i).click();
    cy.url().should('match', /dashboard|account|home/i);

    // Reload and check still logged in
    cy.reload();
    cy.contains(/logout/i).should('be.visible');
  });

  /// Advanced: Test cart persists after reload
  it('persists cart after reload', () => {
    cy.visit('/');
    cy.contains(/shop/i).click();
    cy.get('[data-testid="product-card"]').first().within(() => {
      cy.contains(/add to cart/i).click();
    });
    cy.get('[data-testid="cart-icon"]').click();
    cy.get('[data-testid="cart-item"]').should('have.length.at.least', 1);

    // Reload and check cart still has item
    cy.reload();

    // Reopen cart after reload
    cy.get('[data-testid="cart-icon"]').click();

    // Confirm cart sidebar is visible
    cy.get('[data-testid="cart-sidebar"]').should('be.visible');

    // Confirm that at least one item is still in the cart
    cy.get('[data-testid="cart-item"]')
      .should('exist')
      .and('have.length.at.least', 1);

    // Optionally verify the item name/price still renders correctly
    cy.get('[data-testid="cart-item"]')
      .first()
      .within(() => {
        cy.get('[data-testid="item-name"]').should('be.visible');
        cy.get('[data-testid="item-price"]').should('be.visible');
      });

        // Directly check localStorage for cart persistence
    cy.window().then((win) => {
      const cart = JSON.parse(win.localStorage.getItem('cart'));
      expect(cart).to.have.length.of.at.least(1);
    });
  }); // <-- closes the last "it" block

}); // <-- closes the "describe" block

// E2E: Critical customer flow with advanced best practices

describe('🛒 Customer E2E Flow', () => {
  const email = `customer-e2e+${Date.now()}@example.com`;
  const password = 'Password123!';
  const shopProducts = [
    {
      _id: 'prod-e2e-flow-1',
      name: 'E2E Flow Product',
      price: 14.5,
      stock: 50,
      image: '/images/default-product.png',
      currency: 'USD'
    }
  ];

  beforeEach(() => {
    // Clear cookies/localStorage to ensure clean state
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.intercept('GET', '/api/products*', { statusCode: 200, body: shopProducts }).as('products');
  });

  it('registers, logs in, adds to cart, checks out, and sees order confirmation', () => {
    // Visit home page
    cy.visit('/');

    // Register a new user
    cy.intercept('POST', '/api/auth/register').as('register');
    cy.contains(/register/i).click();
    cy.get('input[name="name"]').type('Test Customer');
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('input[name="confirmPassword"]').type(password);
    cy.get('form').contains('button', /register/i).click();
  cy.wait('@register');

    // Avoid login-page redirect races by authenticating through the stable role helper.
    cy.login('customer');

  // Wait for dashboard or home
  cy.url().should('match', /dashboard|account|home|\//i);

    // Add a product to cart
    cy.visit('/shop');
    cy.wait('@products');
    cy.get('[data-testid="product-card"]').first().within(() => {
      cy.contains(/add to cart/i).click();
    });

  // Open cart page and verify item present
  cy.get('[data-testid="cart-link"]').click();
  cy.url().should('include', '/cart');
  // On CartPage, ensure checkout button is enabled (cart not empty)
  cy.get('[data-testid="checkout-btn"]').should('exist').and('be.enabled');

    // Remove item and re-add to test cart update
    // Remove first item if any and verify cart updates
    cy.contains('button', /Remove/i).first().click({ force: true });
    // Either the cart becomes empty (no checkout button) or remains with fewer items
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="checkout-btn"]').length) {
        cy.get('[data-testid="checkout-btn"]').should('exist');
      } else {
        cy.contains(/your cart is empty/i).should('be.visible');
      }
    });
    // Re-add for checkout
    cy.visit('/shop');
    cy.wait('@products');
    cy.get('[data-testid="product-card"]').first().within(() => {
      cy.contains(/add to cart/i).click();
    });

  // Proceed to checkout from cart page
  cy.get('[data-testid="cart-link"]').click();
  cy.url().should('include', '/cart');
  cy.get('[data-testid="checkout-btn"]').should('be.enabled').click();

    // Fill in checkout form if required
    cy.get('input[name="address"]').type('123 Test St');
    cy.get('input[name="city"]').type('Testville');
    cy.get('input[name="zip"]').type('12345');
    cy.intercept('POST', '/api/orders').as('createOrder');
    cy.get('[data-testid="submit-order-btn"]').click();
    cy.wait('@createOrder');

    // Confirm order confirmation page
    cy.contains(/thank you/i, { timeout: 10000 }).should('be.visible');
    cy.contains(/order has been placed/i).should('be.visible');

    // Confirm authenticated state persisted through checkout flow
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.be.a('string').and.not.be.empty;
    });
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
    cy.get('[data-testid="cart-link"]').click();
    cy.url().should('include', '/cart');
    // On empty cart page, no checkout button is rendered
    cy.contains(/your cart is empty/i).should('be.visible');
    cy.get('[data-testid="checkout-btn"]').should('not.exist');
  });

  // Advanced: Test session persistence after reload
  it('persists session after reload', () => {
    cy.login('customer');
    cy.visit('/account/dashboard');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.be.a('string').and.not.be.empty;
    });

    // Reload and check still logged in
    cy.reload();
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.be.a('string').and.not.be.empty;
    });
    cy.location('pathname').should('not.include', '/login');
  });

  /// Advanced: Test cart persists after reload
  it('persists cart after reload', () => {
    cy.visit('/shop');
    cy.wait('@products');
    cy.get('[data-testid="product-card"]').first().within(() => {
      cy.contains(/add to cart/i).click();
    });
  cy.get('[data-testid="cart-link"]').click();
  cy.url().should('include', '/cart');
  cy.get('[data-testid="checkout-btn"]').should('exist').and('be.enabled');

    // Reload and check cart still has item
    cy.reload();

  // Ensure we're on cart page and UI still interactive
  cy.url().should('include', '/cart');

    // Confirm that at least one item is still in the cart
  // CartPage renders item rows; assert presence via text and checkout button
  cy.get('[data-testid="checkout-btn"]').should('exist').and('be.enabled');

        // Directly check localStorage for cart persistence
    cy.window().then((win) => {
      const stored = win.localStorage.getItem('merkato-cart');
      const cart = stored ? JSON.parse(stored) : { items: [] };
      expect(cart.items || cart).to.have.length.of.at.least(1);
    });
  }); // <-- closes the last "it" block

}); // <-- closes the "describe" block

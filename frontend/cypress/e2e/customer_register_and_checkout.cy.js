// Customer register + authenticated checkout (extracted shard)
// Tags: @customer @checkout @register @candidate
// Purpose: Unique coverage of UI registration + authenticated checkout distinct from guest frictionless path.
// Notes: Further optimization planned (stub analytics, payment intent, marketing banners) before smoke consideration.

describe('🛒 Customer Register + Checkout (Auth Path)', () => {
  const password = 'Password123!';
  const shopProducts = [
    {
      _id: 'prod-e2e-auth-1',
      name: 'E2E Auth Product',
      price: 19.99,
      stock: 25,
      image: '/images/default-product.png',
      currency: 'USD'
    }
  ];
  let email;

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    email = `cust-reg-${Date.now()}@example.com`;
    // Stub non-critical network (placeholder patterns; refine later)
    cy.intercept('POST', /analytics|collect/, { statusCode: 204, body: '' }).as('analytics');
    cy.intercept('GET', /\/api\/promotions\//, { statusCode: 200, body: { banners: [] } }).as('promos');
    cy.intercept('GET', '/api/products*', { statusCode: 200, body: shopProducts }).as('products');
  });

  it('registers new user and completes checkout (COD path)', () => {
    cy.visit('/');

    // Register
    cy.intercept('POST', '/api/auth/register').as('register');
    cy.contains(/register/i).click();
    cy.get('input[name="name"]').type('Checkout User');
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('input[name="confirmPassword"]').type(password);
    cy.get('form').contains('button', /register/i).click();
    cy.wait('@register');

    // Ensure we are authenticated (redirect or manual login fallback)
    cy.location('pathname', { timeout: 10000 }).then((path) => {
      if (path.includes('/register')) {
        cy.visit('/login');
        cy.intercept('POST', '/api/auth/login').as('login');
        cy.get('input[name="email"]').type(email);
        cy.get('input[name="password"]').type(password);
        cy.get('form').contains('button', /login/i).click();
        cy.wait('@login');
      }
    });

    // Navigate to shop & add product
    cy.visit('/shop');
    cy.wait('@products');
    cy.get('[data-testid="product-card"]').first().within(() => {
      cy.contains(/add to cart/i).click();
    });

    // Go to cart
    cy.get('[data-testid="cart-link"]').click();
    cy.url().should('include', '/cart');
    cy.get('[data-testid="checkout-btn"]').should('be.enabled').click();

    // Fill checkout (minimal path)
    cy.get('input[name="address"]').type('123 Cypress Ln');
    cy.get('input[name="city"]').type('Testville');
    cy.get('input[name="zip"]').type('12345');
    cy.intercept('POST', '/api/orders').as('createOrder');
    cy.get('[data-testid="submit-order-btn"]').click();
    cy.wait('@createOrder');

    // Confirmation
    cy.contains(/thank you/i, { timeout: 10000 }).should('be.visible');
    cy.contains(/order has been placed/i).should('be.visible');

    // Basic post-checkout auth state
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.be.a('string').and.not.be.empty;
    });
  });
});

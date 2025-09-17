// Customer register + authenticated checkout (extracted shard)
// Tags: @customer @checkout @register @candidate @thread:auth-register @thread:checkout
// Purpose: Unique coverage of UI registration + authenticated checkout distinct from guest frictionless path.
// Notes: Further optimization planned (stub analytics, payment intent, marketing banners) before smoke consideration.

describe('🛒 Customer Register + Checkout (Auth Path)', () => {
  const password = 'Password123!';
  let email;

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    email = `cust-reg-${Date.now()}@example.com`;
    // Stub non-critical network (placeholder patterns; refine later)
    cy.intercept('POST', /analytics|collect/, { statusCode: 204, body: '' }).as('analytics');
    cy.intercept('GET', /\/api\/promotions\//, { statusCode: 200, body: { banners: [] } }).as('promos');
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
    cy.get('button[type="submit"]').contains(/register/i).click();
    cy.wait('@register');

    // Ensure we are authenticated (redirect or manual login fallback)
    cy.location('pathname', { timeout: 10000 }).then((path) => {
      if (path.includes('/register')) {
        cy.visit('/login');
        cy.intercept('POST', '/api/auth/login').as('login');
        cy.get('input[name="email"]').type(email);
        cy.get('input[name="password"]').type(password);
        cy.get('button[type="submit"]').contains(/login/i).click();
        cy.wait('@login');
      }
    });

    // Navigate to shop & add product
    cy.contains(/shop/i).click();
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
    // Use current field naming used elsewhere
    cy.get('input[name="postalCode"], input[name="zip"]').first().type('12345');

    // Stabilize payments and orders interactions
    cy.intercept('GET', '**/api/payments/methods*', (req) => {
      req.reply({ body: { methods: [{ code: 'cod', displayName: 'Cash on Delivery' }] } });
    }).as('methods');
    cy.get('body').then(($b) => {
      if ($b.find('input[name="paymentMethod"][value="cod"]').length) {
        cy.get('input[name="paymentMethod"][value="cod"]').check({ force: true });
      } else {
        cy.contains(/cash on delivery|pay on delivery/i).click({ force: true });
      }
    });

    cy.intercept('POST', '**/api/orders').as('createOrder');
    cy.get('button[type="submit"]').contains(/place order|pay/i).click();
    cy.wait('@createOrder');

    // Confirmation (tolerant)
    cy.get('body').then(($b) => {
      if ($b.find('[data-testid="order-confirm-msg"], [data-testid="order-confirmation"]').length) {
        cy.get('[data-testid="order-confirm-msg"], [data-testid="order-confirmation"]').should(($el) => {
          const t = ($el.text() || '').toLowerCase();
          expect(t).to.satisfy((x) => x.includes('thank') || x.includes('order placed') || x.includes('confirmed') || x.includes('success'));
        });
      } else {
        cy.contains(/thank|order placed|order confirmed|success/i, { timeout: 10000 }).should('be.visible');
      }
    });

    // Basic post-checkout auth state
    cy.get('[data-testid="navbar"]').within(() => {
      cy.contains(/logout/i).should('exist');
    });
  });
});

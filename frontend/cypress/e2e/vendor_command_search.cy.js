// Tags: @vendor @navbar @command-center

// E2E for Vendor Navbar Command-Center search
// Verifies:
//  - Type switch (Product/Order)
//  - Suggestions from localStorage-backed sources
//  - Click suggestion navigates appropriately
//  - Slash commands navigation (e.g., /upload)

describe('🧭 Vendor Command-Center Search', () => {
  const vendorEmail = 'vendor@test.com';
  const vendorPassword = 'Password123!';

  const seedProducts = [
    { id: 'p-cc-1', name: 'CommandCenter Product One', sku: 'CMD-1', tags: ['cmd','search'], image: '/uploads/mock1.jpg' },
    { id: 'p-cc-2', name: 'Other Product', sku: 'OTH-2', tags: ['misc'], image: '/uploads/mock2.jpg' }
  ];
  const seedOrders = [
    { id: '1', orderId: 'ORD-1002', customerName: 'Bob Tester', status: 'paid' },
    { id: '2', orderId: 'ORD-2003', customerName: 'Alice', status: 'processing' }
  ];

  before(() => {
    cy.log('🚀 Vendor Command-Center Search E2E start');
  });

  beforeEach(() => {
    // Login as vendor (reuse app flow)
    cy.intercept('POST', '/api/auth/login').as('login');
    cy.visit('/login');
    cy.get('input[name=email]').type(vendorEmail);
    cy.get('input[name=password]').type(vendorPassword);
    cy.get('[data-cy="login-button"], button[type=submit][aria-label="Sign In"]').first().click();
    cy.wait('@login');

    // Seed localStorage for vendor suggestions
    cy.window().then((win) => {
      win.localStorage.setItem('uploadedProducts', JSON.stringify(seedProducts));
      win.localStorage.setItem('vendor-orders', JSON.stringify(seedOrders));
      // ensure role persisted (if app doesn't already)
      try {
        const u = JSON.parse(win.localStorage.getItem('user') || '{}');
        if (!u.role && !Array.isArray(u.roles)) {
          win.localStorage.setItem('user', JSON.stringify({ ...u, role: 'vendor' }));
        }
      } catch {}
    });
  });

  it('shows product suggestions and navigates to VendorProducts', () => {
    cy.visit('/vendor');

    // Ensure vendor search controls exist
    cy.get('[data-testid="vendor-search-type"]').should('exist');
    cy.get('[data-testid="vendor-search-input"]').should('exist');

    // Select Product, type partial name
    cy.get('[data-testid="vendor-search-type"]').select('product');
    cy.get('[data-testid="vendor-search-input"]').click().type('CommandCenter');

    // Expect at least one suggestion with our product
    cy.get('[data-testid="vendor-suggest-item"]').should('exist').first().should(($el) => {
      const txt = ($el.text() || '').toLowerCase();
      expect(txt).to.include('commandcenter product one');
    }).click();

    // Navigates to vendor products page
    cy.location('pathname', { timeout: 10000 }).should('include', '/vendor/products');
  });

  it('supports slash command /upload', () => {
    cy.visit('/vendor');
    cy.get('[data-testid="vendor-search-input"]').click().type('/upload{enter}');
    cy.location('pathname', { timeout: 10000 }).should('include', '/vendor/upload');
  });

  it('shows order suggestions and navigates to VendorOrders', () => {
    cy.visit('/vendor');
    cy.get('[data-testid="vendor-search-type"]').select('order');
    cy.get('[data-testid="vendor-search-input"]').click().type('1002');

    cy.get('[data-testid="vendor-suggest-item"]').should('exist').first().should(($el) => {
      const txt = ($el.text() || '').toLowerCase();
      expect(txt).to.include('ord-1002');
    }).click();

    cy.location('pathname', { timeout: 10000 }).should('include', '/vendor/orders');
  });
});

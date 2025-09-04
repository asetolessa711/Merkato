describe('🔐 Role-Based Access Tests (Stabilized)', () => {
  const baseUrl = 'http://localhost:3000';

  const testUsers = {
    customer: 'customer@test.com',
    vendor: 'vendor@test.com',
    admin: 'admin@test.com',
    global_admin: 'global_admin@test.com',
    country_admin: 'country_admin@test.com'
  };

  const login = (role) => {
    cy.visit(`${baseUrl}/login`);
    cy.get('input[name=email]').type(testUsers[role]);
    cy.get('input[name=password]').type('Password123!');
    cy.get('button[type=submit]').click();

    // Wait for redirected route based on role
    if (role === 'customer') {
      cy.location('pathname', { timeout: 10000 }).should('include', '/account/dashboard');
    } else if (role === 'vendor') {
      cy.location('pathname', { timeout: 10000 }).should('include', '/vendor');
    } else {
      cy.location('pathname', { timeout: 10000 }).should('include', '/admin');
    }
  };

  // ✅ Should Have Access
  it('🔵 Customer should access /account/dashboard', () => {
    login('customer');
    cy.get('[data-testid="customer-dashboard-title"]', { timeout: 10000 }).should('exist').and('be.visible');
  });

  it('🟠 Vendor should access /vendor', () => {
    login('vendor');
    cy.get('[data-testid="vendor-dashboard-title"]', { timeout: 10000 }).should('exist').and('be.visible');
  });

  it('🔴 Admin should access /admin', () => {
    login('admin');
    cy.get('[data-testid="admin-dashboard-title"]', { timeout: 10000 }).should('exist').and('be.visible');
  });

  it('🌍 Global Admin should access /admin', () => {
    login('global_admin');
    cy.get('[data-testid="admin-dashboard-title"]', { timeout: 10000 }).should('exist').and('be.visible');
  });

  it('🌎 Country Admin should access /admin', () => {
    login('country_admin');
    cy.get('[data-testid="admin-dashboard-title"]', { timeout: 10000 }).should('exist').and('be.visible');
  });

  // ❌ Should Be Denied
  it('❌ Vendor should NOT access /admin', () => {
    login('vendor');
    cy.visit(`${baseUrl}/admin`);
    cy.location('pathname', { timeout: 10000 }).should('eq', '/vendor');
    cy.get('[data-testid="vendor-dashboard-title"]', { timeout: 10000 }).should('exist').and('be.visible');
  });

  it('❌ Customer should NOT access /admin', () => {
    login('customer');
    cy.visit(`${baseUrl}/admin`);
    cy.location('pathname', { timeout: 15000 }).should('eq', '/account/dashboard');
    // Allow any async dashboard loads to resolve then assert on one of the stable markers
    cy.get('[data-testid="customer-dashboard-title"], [data-testid="customer-dashboard-root"]', {
      timeout: 20000,
    }).should('exist').and('be.visible');
  });

  it('❌ Admin should NOT access /vendor', () => {
    login('admin');
    cy.visit(`${baseUrl}/vendor`);
    cy.location('pathname', { timeout: 10000 }).should('eq', '/admin/dashboard');
    cy.get('[data-testid="admin-dashboard-title"]', { timeout: 10000 }).should('exist').and('be.visible');
  });

  it('❌ Customer should NOT access /vendor', () => {
  login('customer');
  cy.wait(500); // allow redirect to settle
  cy.visit(`${baseUrl}/vendor`);
  cy.location('pathname', { timeout: 10000 }).should('eq', '/account/dashboard');
  cy.get('[data-testid="customer-dashboard-title"]', { timeout: 10000 }).should('exist');
});

  it('❌ Vendor should NOT access /account/dashboard', () => {
    login('vendor');
    cy.visit(`${baseUrl}/account/dashboard`);
    cy.location('pathname', { timeout: 10000 }).should('eq', '/vendor');
    cy.get('[data-testid="vendor-dashboard-title"]', { timeout: 10000 }).should('exist').and('be.visible');
  });

  it('❌ Admin should NOT access /account/dashboard', () => {
    login('admin');
    cy.visit(`${baseUrl}/account/dashboard`);
    cy.location('pathname', { timeout: 10000 }).should('eq', '/admin/dashboard');
    cy.get('[data-testid="admin-dashboard-title"]', { timeout: 10000 }).should('exist').and('be.visible');
  });
});

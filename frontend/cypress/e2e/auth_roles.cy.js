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

    // Wait for the dashboard route after login
    if (role === 'customer') {
      cy.location('pathname', { timeout: 10000 }).should('include', '/account/dashboard');
    } else if (role === 'vendor') {
      cy.location('pathname', { timeout: 10000 }).should('include', '/vendor');
    } else if (role === 'admin' || role === 'global_admin' || role === 'country_admin') {
      cy.location('pathname', { timeout: 10000 }).should('include', '/admin');
    }
  };

  // ✅ Should Have Access
  it('🔵 Customer should access /account/dashboard', () => {
    login('customer');
    cy.contains('Customer Dashboard'); // Updated
  });

  it('🟠 Vendor should access /vendor', () => {
    login('vendor');
    cy.contains('Vendor Dashboard'); // Updated
  });

  it('🔴 Admin should access /admin', () => {
    login('admin');
    cy.contains('Admin Dashboard'); // Updated
  });

  it('🌍 Global Admin should access /admin', () => {
    login('global_admin');
    cy.contains('Admin Dashboard'); // Updated
  });

  it('🌎 Country Admin should access /admin', () => {
    login('country_admin');
    cy.contains('Admin Dashboard'); // Updated
  });

  // ❌ Should Be Denied
  it('❌ Vendor should NOT access /admin', () => {
    login('vendor');
    cy.visit(`${baseUrl}/admin`);
    cy.location('pathname').should('eq', '/vendor'); // Vendor should be redirected to their dashboard
    cy.contains('Vendor Dashboard'); // Updated
  });

  it('❌ Customer should NOT access /admin', () => {
    login('customer');
    cy.visit(`${baseUrl}/admin`);
    cy.location('pathname').should('eq', '/account/dashboard'); // Customer should be redirected to their dashboard
    cy.contains('Customer Dashboard'); // Updated
  });

  it('❌ Admin should NOT access /vendor', () => {
    login('admin');
    cy.visit(`${baseUrl}/vendor`);
    cy.location('pathname').should('eq', '/admin/dashboard'); // Admin should be redirected to their dashboard
    cy.contains('Admin Dashboard');
  });

  it('❌ Customer should NOT access /vendor', () => {
    login('customer');
    cy.visit(`${baseUrl}/vendor`);
    cy.location('pathname').should('eq', '/account/dashboard'); // Customer should be redirected to their dashboard
    cy.contains('Customer Dashboard'); // Updated
  });

  it('❌ Vendor should NOT access /account/dashboard', () => {
    login('vendor');
    cy.visit(`${baseUrl}/account/dashboard`);
    cy.location('pathname').should('eq', '/vendor'); // Vendor should be redirected to their dashboard
    cy.contains('Vendor Dashboard'); // Updated
  });

  it('❌ Admin should NOT access /account/dashboard', () => {
    login('admin');
    cy.visit(`${baseUrl}/account/dashboard`);
    cy.location('pathname').should('eq', '/admin/dashboard'); // Admin should be redirected to their dashboard
    cy.contains('Admin Dashboard');
  });
});
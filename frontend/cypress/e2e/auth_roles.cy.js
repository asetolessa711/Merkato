describe('🔐 Role-Based Access Tests (Aligned with Role Logic)', () => {
  const baseUrl = 'http://localhost:3000';

  // Explicitly map roles to emails for clarity and future-proofing
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
  };

  it('🔵 Customer should access /account/dashboard', () => {
    login('customer');
    cy.url().should('include', '/account/dashboard');
    cy.contains('Dashboard');
  });

  it('🟠 Vendor should access /vendor', () => {
    login('vendor');
    cy.url().should('include', '/vendor');
    cy.contains('Vendor');
  });

  it('🔴 Admin should access /admin', () => {
    login('admin');
    cy.url().should('include', '/admin');
    cy.contains('Admin');
  });

  it('🌍 Global Admin should access /admin', () => {
    login('global_admin');
    cy.url().should('include', '/admin');
    cy.contains('Admin');
  });

  it('🌎 Country Admin should access /admin', () => {
    login('country_admin');
    cy.url().should('include', '/admin');
    cy.contains('Admin');
  });

  it('❌ Vendor should NOT access /admin', () => {
    login('vendor');
    cy.visit(`${baseUrl}/admin`);
    cy.url().should('not.include', '/admin');
    cy.url().should('eq', `${baseUrl}/`);
  });

  it('❌ Customer should NOT access /admin', () => {
    login('customer');
    cy.visit(`${baseUrl}/admin`);
    cy.url().should('not.include', '/admin');
    cy.url().should('eq', `${baseUrl}/`);
  });

  it('❌ Admin should NOT access /vendor', () => {
    login('admin');
    cy.visit(`${baseUrl}/vendor`);
    cy.url().should('not.include', '/vendor');
    cy.url().should('eq', `${baseUrl}/`);
  });

  it('❌ Customer should NOT access /vendor', () => {
    login('customer');
    cy.visit(`${baseUrl}/vendor`);
    cy.url().should('not.include', '/vendor');
    cy.url().should('eq', `${baseUrl}/`);
  });

  it('❌ Vendor should NOT access /account/dashboard', () => {
    login('vendor');
    cy.visit(`${baseUrl}/account/dashboard`);
    cy.url().should('not.include', '/account/dashboard');
    cy.url().should('eq', `${baseUrl}/`);
  });

  it('❌ Admin should NOT access /account/dashboard', () => {
    login('admin');
    cy.visit(`${baseUrl}/account/dashboard`);
    cy.url().should('not.include', '/account/dashboard');
    cy.url().should('eq', `${baseUrl}/`);
  });
});
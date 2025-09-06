// Role-based access tests using seeded users, API login (faster), and relative URLs
describe('Role-Based Access Tests (Stabilized)', () => {
  before(() => {
    // Ensure we have the standard users/roles available
    cy.task('db:seed');
  });

  const loginAs = (role) => {
    // Fast API login avoids UI flake and speeds up the suite
    cy.login(role);
  };

  it('Customer should access /account/dashboard', () => {
    loginAs('customer');
    cy.visit('/account/dashboard');
    cy.get('[data-testid="customer-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Vendor should access /vendor', () => {
    loginAs('vendor');
    cy.visit('/vendor');
    cy.get('[data-testid="vendor-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Admin should access /admin', () => {
    loginAs('admin');
    cy.visit('/admin');
    cy.get('[data-testid="admin-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Global Admin should access /admin', () => {
    loginAs('global_admin');
    cy.visit('/admin');
    cy.get('[data-testid="admin-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Country Admin should access /admin', () => {
    loginAs('country_admin');
    cy.visit('/admin');
    cy.get('[data-testid="admin-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Vendor should NOT access /admin', () => {
    loginAs('vendor');
    cy.visit('/admin');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/vendor');
    cy.get('[data-testid="vendor-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Customer should NOT access /admin', () => {
    loginAs('customer');
    cy.visit('/admin');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/account/dashboard');
    cy.get('[data-testid="customer-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Admin should NOT access /vendor', () => {
    loginAs('admin');
    cy.visit('/vendor');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/admin/dashboard');
    cy.get('[data-testid="admin-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Customer should NOT access /vendor', () => {
    loginAs('customer');
    cy.visit('/vendor');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/account/dashboard');
    cy.get('[data-testid="customer-dashboard-title"]', { timeout: 15000 }).should('exist');
  });

  it('Vendor should NOT access /account/dashboard', () => {
    loginAs('vendor');
    cy.visit('/account/dashboard');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/vendor');
    cy.get('[data-testid="vendor-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Admin should NOT access /account/dashboard', () => {
    loginAs('admin');
    cy.visit('/account/dashboard');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/admin/dashboard');
    cy.get('[data-testid="admin-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });
});

// Role-based access tests (LEGACY MONOLITH) — superseded by shard specs:
//  - auth_roles_positive.cy.js
//  - auth_roles_negative.cy.js
//  - auth_roles_extended_admin.cy.js
// Tags: @auth-flow @roles @nightly @legacy
// Keep temporarily for parity; remove after shards validated in CI.
describe('Role-Based Access Tests (Legacy Monolith) @auth-flow @roles @nightly @legacy', () => {
  before(() => {
    // Ensure we have the standard users/roles available
    cy.task('db:seed');
  });

  const loginAs = (role) => {
    // Fast API login avoids UI flake and speeds up the suite
    cy.login(role);
  };

  it('Customer should access /account/dashboard @buyer @auth-flow', () => {
    loginAs('customer');
    cy.visit('/account/dashboard');
    cy.get('[data-testid="customer-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Vendor should access /vendor @vendor @auth-flow', () => {
    loginAs('vendor');
    cy.visit('/vendor');
    cy.get('[data-testid="vendor-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Admin should access /admin @admin @auth-flow', () => {
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

  it('Vendor should NOT access /admin @vendor @auth-flow', () => {
    loginAs('vendor');
    cy.visit('/admin');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/vendor');
    cy.get('[data-testid="vendor-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Customer should NOT access /admin @buyer @auth-flow @negative', () => {
    loginAs('customer');
    cy.visit('/admin');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/account/dashboard');
    // Accept either the container (loading shell) or the title (loaded header)
    cy.get('[data-testid="dashboard-content"], [data-testid="customer-dashboard-title"]', { timeout: 15000 })
      .should('exist');
  });

  it('Admin should NOT access /vendor @admin @auth-flow @negative', () => {
    loginAs('admin');
    cy.visit('/vendor');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/admin/dashboard');
    cy.get('[data-testid="admin-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Customer should NOT access /vendor @buyer @auth-flow @negative', () => {
    loginAs('customer');
    cy.visit('/vendor');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/account/dashboard');
    cy.get('[data-testid="dashboard-content"], [data-testid="customer-dashboard-title"]', { timeout: 15000 })
      .should('exist');
  });

  it('Vendor should NOT access /account/dashboard @vendor @auth-flow @negative', () => {
    loginAs('vendor');
    cy.visit('/account/dashboard');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/vendor');
    cy.get('[data-testid="vendor-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });

  it('Admin should NOT access /account/dashboard @admin @auth-flow @negative', () => {
    loginAs('admin');
    cy.visit('/account/dashboard');
    cy.location('pathname', { timeout: 15000 }).should('eq', '/admin/dashboard');
    cy.get('[data-testid="admin-dashboard-title"]', { timeout: 15000 }).should('exist').and('be.visible');
  });
});

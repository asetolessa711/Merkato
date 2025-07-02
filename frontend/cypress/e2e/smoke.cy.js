describe('🌐 Smoke Test - Core Flows', () => {
  before(() => {
    cy.task('db:seed'); // Ensure seeded
  });

  it('logs in as admin', () => {
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type('admin@example.com');
    cy.get('[data-cy=password-input]').type('Password123!');
    cy.get('[data-cy=login-button]').click();
    cy.url().should('include', '/admin');
    cy.get('[data-cy=dashboard-content]').should('contain', 'Welcome back, Admin');
  });

  it('logs in as vendor', () => {
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type('vendor@example.com');
    cy.get('[data-cy=password-input]').type('Password123!');
    cy.get('[data-cy=login-button]').click();
    cy.url().should('include', '/vendor');
    cy.get('[data-cy=dashboard-content]').should('contain', 'Welcome back, Vendor');
  });

  it('logs in as customer', () => {
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type('testuser@example.com');
    cy.get('[data-cy=password-input]').type('Password123!');
    cy.get('[data-cy=login-button]').click();
    cy.url().should('include', '/account/dashboard');
    cy.get('[data-cy=dashboard-content]').should('contain', 'Welcome back, Customer');
  });
});

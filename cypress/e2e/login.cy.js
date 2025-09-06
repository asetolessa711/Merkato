describe('Login Flow', () => {
  it('logs in as vendor and redirects to vendor dashboard', () => {
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type('vendor@example.com');
    cy.get('[data-cy=password-input]').type('password123');
    cy.get('[data-cy=login-button]').click();
    cy.url().should('include', '/vendor');
    cy.get('[data-cy=dashboard-content]').should('contain', 'Welcome');
  });

  it('logs in as customer and redirects to account dashboard', () => {
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type('customer@example.com');
    cy.get('[data-cy=password-input]').type('password123');
    cy.get('[data-cy=login-button]').click();
    cy.url().should('include', '/account/dashboard');
    cy.get('[data-cy=dashboard-content]').should('contain', 'Welcome');
  });

  it('logs in as admin and redirects to admin dashboard', () => {
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type('admin@example.com');
    cy.get('[data-cy=password-input]').type('password123');
    cy.get('[data-cy=login-button]').click();
    cy.url().should('include', '/admin');
    cy.get('[data-cy=dashboard-content]').should('contain', 'Welcome');
  });
});

// Logout Flow integration
describe('Logout Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type('vendor@example.com');
    cy.get('[data-cy=password-input]').type('password123');
    cy.get('[data-cy=login-button]').click();
    cy.url().should('include', '/vendor');
  });

  it('logs out and returns to homepage', () => {
    cy.get('[data-cy=logout-button]').click();
    cy.url().should('include', '/');
  });
});
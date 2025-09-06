describe('Smoke Test - Core Flows', () => {
  before(() => {
    cy.task('db:seed');
  });

  it('logs in as admin', () => {
    cy.login('admin');
    cy.visit('/admin');
    cy.url({ timeout: 10000 }).should('include', '/admin');
  });

  it('logs in as vendor', () => {
    cy.login('vendor');
    cy.visit('/vendor');
    cy.url({ timeout: 10000 }).should('include', '/vendor');
  });

  it('logs in as customer', () => {
    cy.login('customer');
    cy.visit('/account/dashboard');
    cy.url({ timeout: 10000 }).should('include', '/account/dashboard');
  });
});


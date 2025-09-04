// Invalid login should show an error message and stay on /login
describe('🔐 Login Error Handling', () => {
  it('shows error on invalid credentials', () => {
    cy.visit('/login');
    cy.get('input[name=email]').type('not-a-user@example.com');
    cy.get('input[name=password]').type('WrongPass123!');
    cy.get('button[type=submit]').click();
    cy.contains(/We couldn.?t log you in|Please check your email/i, { timeout: 10000 }).should('be.visible');
    cy.location('pathname').should('include', '/login');
  });
});


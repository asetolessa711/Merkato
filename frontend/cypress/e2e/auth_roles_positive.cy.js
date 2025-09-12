// Positive role access shard
// Tags: @auth-flow @roles @candidate
// Covers minimal happy path access for core roles to keep future smoke shard lightweight.

describe('Role Access (Positive Core Roles)', () => {
  before(() => {
    cy.task('db:seed');
  });

  const cases = [
    { role: 'customer', path: '/account/dashboard', testId: '[data-testid="customer-dashboard-title"]' },
    { role: 'vendor', path: '/vendor', testId: '[data-testid="vendor-dashboard-title"]' },
    { role: 'admin', path: '/admin', testId: '[data-testid="admin-dashboard-title"]' }
  ];

  cases.forEach(({ role, path, testId }) => {
    it(`${role} can access ${path}`, () => {
      cy.login(role);
      cy.visit(path);
      cy.get(testId, { timeout: 10000 }).should('exist').and('be.visible');
    });
  });
});

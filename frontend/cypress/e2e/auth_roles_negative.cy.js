// Negative role redirect shard
// Tags: @auth-flow @roles @nightly @negative
// Covers disallowed access redirection logic.

describe('Role Access (Negative Redirects)', () => {
  before(() => {
    cy.task('db:seed');
  });

  const redirects = [
    { role: 'vendor', path: '/admin', expect: '/vendor', testId: '[data-testid="vendor-dashboard-title"]' },
    { role: 'customer', path: '/admin', expect: '/account/dashboard', testId: '[data-testid="customer-dashboard-title"], [data-testid="dashboard-content"]' },
    { role: 'admin', path: '/vendor', expect: '/admin/dashboard', testId: '[data-testid="admin-dashboard-title"]' },
    { role: 'customer', path: '/vendor', expect: '/account/dashboard', testId: '[data-testid="customer-dashboard-title"], [data-testid="dashboard-content"]' },
    { role: 'vendor', path: '/account/dashboard', expect: '/vendor', testId: '[data-testid="vendor-dashboard-title"]' },
    { role: 'admin', path: '/account/dashboard', expect: '/admin/dashboard', testId: '[data-testid="admin-dashboard-title"]' }
  ];

  redirects.forEach(({ role, path, expect, testId }) => {
    it(`${role} redirected from ${path} to ${expect}`, () => {
      cy.login(role);
      cy.visit(path);
      cy.location('pathname', { timeout: 10000 }).should('eq', expect);
      cy.get(testId.split(',')[0].trim(), { timeout: 10000 }).should('exist');
    });
  });
});

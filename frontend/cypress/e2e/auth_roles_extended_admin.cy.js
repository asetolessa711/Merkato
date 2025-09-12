// Extended admin variants shard
// Tags: @auth-flow @roles @nightly
// Focuses on less common admin role variants.

describe('Role Access (Extended Admin Variants)', () => {
  before(() => {
    cy.task('db:seed');
  });

  const variants = [
    { role: 'global_admin', path: '/admin', testId: '[data-testid="admin-dashboard-title"]' },
    { role: 'country_admin', path: '/admin', testId: '[data-testid="admin-dashboard-title"]' }
  ];

  variants.forEach(({ role, path, testId }) => {
    it(`${role} can access ${path}`, () => {
      cy.login(role);
      cy.visit(path);
      cy.get(testId, { timeout: 10000 }).should('exist').and('be.visible');
    });
  });
});

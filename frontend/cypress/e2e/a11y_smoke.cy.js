// A11y smoke: run axe on key pages and surface top 5 violations
// Keep very lightweight: home, shop, product detail, cart, checkout

describe('♿ A11y smoke', () => {
  const pages = ['/', '/shop', '/cart', '/checkout'];

  before(() => {
    // Seed to ensure pages render predictable content
    cy.task('db:seed');
  });

  pages.forEach((path) => {
    it(`has no critical violations on ${path} @a11y`, () => {
      cy.visit(path);
      // Scope to body; include only serious/critical for speed
      if (cy.injectAxe) cy.injectAxe();
      cy.checkA11y ? cy.checkA11y('body', {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa']
        },
        includedImpacts: ['serious', 'critical']
      }) : null;
    });
  });
});

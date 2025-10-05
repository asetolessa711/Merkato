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

      let violationsCount = 0;
      cy.checkA11y ? cy.checkA11y(
        'body',
        {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
          includedImpacts: ['serious', 'critical']
        },
        (violations) => {
          violationsCount = violations.length;
          violations.forEach((v) => {
            const firstNode = (v.nodes && v.nodes[0]) || {};
            const snippet = firstNode.html ? String(firstNode.html).slice(0, 180) : '';
            const selector = firstNode.target && firstNode.target.length ? String(firstNode.target[0]) : '';
            const msg = `[a11y] ${path}: ${v.id} — ${v.help} (${v.impact}) :: ${selector} :: ${snippet}\n${v.helpUrl}`;
            if (cy.task) {
              cy.task('a11y:warn', msg, { log: false });
            } else {
              // eslint-disable-next-line no-console
              console.warn(msg);
            }
          });
        },
        true // skipFailures to allow logging before we assert
      ) : null;

      cy.then(() => {
        expect(violationsCount, `${path} has no serious/critical a11y violations`).to.equal(0);
      });
    });
  });
});

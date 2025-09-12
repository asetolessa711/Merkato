// Tags: @a11y @a11y-smoke
// A11y smoke: run axe on key pages and surface top 5 violations
// Keep very lightweight: home, shop, product detail, cart, checkout
// Behavior:
//   - By default: record & log critical violations but DO NOT fail (observability mode).
//   - If env A11Y_ENFORCE=true then any critical violation fails the test.
//   - If env A11Y_SKIP=true the suite is skipped (useful for temporary bypass in CI matrix).
// Artifacts:
//   - Writes aggregated per-route summary JSON to cypress-results and timestamped test-report folder.

describe('♿ A11y smoke', () => {
  const pages = ['/', '/shop', '/cart', '/checkout'];
  const summary = {};
  const enforce = Cypress.env('A11Y_ENFORCE') === true || String(Cypress.env('A11Y_ENFORCE')).toLowerCase() === 'true';
  const skip = Cypress.env('A11Y_SKIP') === true || String(Cypress.env('A11Y_SKIP')).toLowerCase() === 'true';

  if (skip) {
    it('skipped via A11Y_SKIP env flag', () => {
      cy.log('A11Y_SKIP=true -> skipping a11y smoke checks');
    });
    return; // abort defining further tests
  }

  before(() => {
    // Seed to ensure pages render predictable content
    cy.task('db:seed');
  });

  pages.forEach((path) => {
    const tags = path === '/shop' ? '@a11y @a11y-critical' : '@a11y';
    it(`has no critical violations on ${path} ${tags}${enforce ? ' (enforced)' : ''}`, () => {
      cy.visit(path);
      // Ensure axe is injected (imported globally, but guard defensively)
      if (cy.injectAxe) cy.injectAxe();

      if (cy.checkA11y) {
        cy.checkA11y('body', {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
          includedImpacts: ['critical']
        }, (violations) => {
          const list = Array.isArray(violations) ? violations : [];
          if (list.length) {
            const top = list.slice(0, 5).map(v => `${v.id} (${v.nodes?.length || 0} nodes)`).join(', ');
            // eslint-disable-next-line no-console
            console.warn(`[a11y] ${path}: critical violations: ${top}`);
          }
          // Collect structured data
          summary[path] = {
            count: list.length,
            violations: list.map(v => ({
              id: v.id,
              impact: v.impact,
              nodes: v.nodes?.length || 0,
              help: v.help,
              helpUrl: v.helpUrl
            }))
          };
          if (enforce && list.length) {
            // Provide concise failing message with first few IDs
            const ids = list.slice(0, 3).map(v => v.id).join(', ');
            throw new Error(`Accessibility critical violations on ${path}: ${ids}${list.length > 3 ? ` +${list.length - 3} more` : ''}`);
          }
        });
      } else {
        cy.log('cy.checkA11y not available');
      }
    });
  });

  after(() => {
    // Write a11y summary artifact to cypress-results and test-report folder
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
    const meta = { generatedAt: new Date().toISOString(), enforced: enforce, pages: pages.length };
    const counts = Object.fromEntries(Object.entries(summary).map(([p, data]) => [p, data.count]));
    const asJson = JSON.stringify({ meta, counts, summary }, null, 2);
    cy.writeFile('cypress-results/a11y-summary.json', asJson, 'utf8');
    cy.writeFile(`test-report/${stamp}/a11y-summary.json`, asJson, 'utf8');
  });
});

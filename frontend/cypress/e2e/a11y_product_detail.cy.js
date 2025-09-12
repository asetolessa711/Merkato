// Tags: @a11y
// A11y check for a representative product detail page
// Default observe; enforce via A11Y_ENFORCE=true

describe('♿ A11y — Product Detail', () => {
  const enforce = Cypress.env('A11Y_ENFORCE') === true || String(Cypress.env('A11Y_ENFORCE')).toLowerCase() === 'true';
  const skip = Cypress.env('A11Y_SKIP') === true || String(Cypress.env('A11Y_SKIP')).toLowerCase() === 'true';
  const API = Cypress.env('API_URL') || 'http://localhost:5000';
  const summary = {};

  if (skip) {
    it('skipped via A11Y_SKIP env flag', () => {
      cy.log('A11Y_SKIP=true -> skipping a11y product detail');
    });
    return;
  }

  before(() => {
    cy.task('db:seed');
  });

  it(`has no critical violations on a product page @a11y${enforce ? ' (enforced)' : ''}`, () => {
    cy.request('GET', `${API.replace(/\/$/, '')}/api/products`).then((res) => {
      const list = Array.isArray(res.body) ? res.body : (res.body?.products || []);
      expect(list.length, 'products length').to.be.greaterThan(0);
      const prod = list[0];
      expect(prod && prod._id, 'product _id').to.exist;
      cy.visit(`/product/${prod._id}`);
      // Ensure axe is injected before running checks
      if (cy.injectAxe) cy.injectAxe();
      if (cy.checkA11y) {
        const skipFailures = !enforce; // observe by default; fail only when enforced
        cy.log(`[a11y] product detail: enforce=${String(enforce)} skipFailures=${String(skipFailures)}`);
        cy.checkA11y('body', {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
          includedImpacts: ['critical']
        }, (violations) => {
          const list = Array.isArray(violations) ? violations : [];
          summary['/product/:id'] = {
            count: list.length,
            violations: list.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes?.length || 0, help: v.help, helpUrl: v.helpUrl }))
          };
          if (enforce && list.length) {
            const ids = list.slice(0, 3).map(v => v.id).join(', ');
            throw new Error(`Accessibility critical violations on /product/:id: ${ids}${list.length > 3 ? ` +${list.length - 3} more` : ''}`);
          }
        }, Boolean(skipFailures));
      } else {
        cy.log('cy.checkA11y not available');
      }
    });
  });

  after(() => {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
    const meta = { generatedAt: new Date().toISOString(), enforced: enforce, pages: 1 };
    const counts = Object.fromEntries(Object.entries(summary).map(([p, data]) => [p, data.count]));
    const asJson = JSON.stringify({ meta, counts, summary }, null, 2);
    cy.writeFile('cypress-results/a11y-product-detail-summary.json', asJson, 'utf8');
    cy.writeFile(`test-report/${stamp}/a11y-product-detail-summary.json`, asJson, 'utf8');
  });
});

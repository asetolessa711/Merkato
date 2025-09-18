// Tags: @a11y
// A11y check for cart page with at least one item added
// Default observe; enforce via A11Y_ENFORCE=true

describe('♿ A11y — Cart (with items)', () => {
  const enforce = Cypress.env('A11Y_ENFORCE') === true || String(Cypress.env('A11Y_ENFORCE')).toLowerCase() === 'true';
  const skip = Cypress.env('A11Y_SKIP') === true || String(Cypress.env('A11Y_SKIP')).toLowerCase() === 'true';
  const API = Cypress.env('API_URL') || 'http://localhost:5000';
  const summary = {};

  if (skip) {
    it('skipped via A11Y_SKIP env flag', () => {
      cy.log('A11Y_SKIP=true -> skipping a11y cart-with-items');
    });
    return;
  }

  before(() => {
    cy.task('db:seed');
    // Pre-initialize summary so route appears even with 0 violations
    summary['/cart'] = { count: 0, violations: [] };
  });

  it(`has no critical violations on /cart with an item @a11y${enforce ? ' (enforced)' : ''}`, () => {
    cy.request('GET', `${API.replace(/\/$/, '')}/api/products`).then((res) => {
      const list = Array.isArray(res.body) ? res.body : (res.body?.products || []);
      expect(list.length, 'products length').to.be.greaterThan(0);
      const prod = list[0];
      expect(prod && prod._id, 'product _id').to.exist;
      cy.visit(`/product/${prod._id}`);
      // Add to cart using test id if present; fallback to text search
      cy.get('body').then($body => {
        if ($body.find('[data-testid="add-to-cart-btn"]').length) {
          cy.get('[data-testid="add-to-cart-btn"]').click({ force: true });
        } else {
          cy.contains(/add to cart/i).click({ force: true });
        }
      });
      cy.visit('/cart');
      if (cy.injectAxe) cy.injectAxe();
      if (cy.checkA11y) {
        const skipFailures = !enforce;
        cy.checkA11y('body', {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
          includedImpacts: ['critical']
        }, (violations) => {
          const list = Array.isArray(violations) ? violations : [];
          summary['/cart'] = {
            count: list.length,
            violations: list.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes?.length || 0, help: v.help, helpUrl: v.helpUrl }))
          };
          if (enforce && list.length) {
            const ids = list.slice(0, 3).map(v => v.id).join(', ');
            throw new Error(`Accessibility critical violations on /cart: ${ids}${list.length > 3 ? ` +${list.length - 3} more` : ''}`);
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
    cy.writeFile('cypress-results/a11y-cart-summary.json', asJson, 'utf8');
    cy.writeFile(`test-report/${stamp}/a11y-cart-summary.json`, asJson, 'utf8');
  });
});


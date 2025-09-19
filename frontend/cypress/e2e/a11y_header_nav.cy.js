// Tags: @a11y
// A11y checks focused on header/navigation areas across key routes
// Default observe; enforce via A11Y_ENFORCE=true

describe('♿ A11y — Header & Navigation', () => {
  const pages = ['/', '/shop'];
  const summary = {};
  const enforce = Cypress.env('A11Y_ENFORCE') === true || String(Cypress.env('A11Y_ENFORCE')).toLowerCase() === 'true';
  const skip = Cypress.env('A11Y_SKIP') === true || String(Cypress.env('A11Y_SKIP')).toLowerCase() === 'true';

  if (skip) {
    it('skipped via A11Y_SKIP env flag', () => {
      cy.log('A11Y_SKIP=true -> skipping a11y header/nav checks');
    });
    return;
  }

  before(() => {
    cy.task('db:seed');
  });

  pages.forEach((path) => {
    it(`has no critical violations on ${path} (header/nav) @a11y${enforce ? ' (enforced)' : ''}`, () => {
      cy.visit(path);
      if (cy.injectAxe) cy.injectAxe();
      if (cy.checkA11y) {
        // Pre-initialize summary so routes with 0 violations are recorded
        summary[path] = { count: 0, violations: [] };
        const skipFailures = !enforce;
        cy.checkA11y('body', {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
          includedImpacts: ['critical']
        }, (violations) => {
          const list = Array.isArray(violations) ? violations : [];
          summary[path] = {
            count: list.length,
            violations: list.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes?.length || 0, help: v.help, helpUrl: v.helpUrl }))
          };
          if (enforce && list.length) {
            const ids = list.slice(0, 3).map(v => v.id).join(', ');
            throw new Error(`Accessibility critical violations on ${path}: ${ids}${list.length > 3 ? ` +${list.length - 3} more` : ''}`);
          }
        }, Boolean(skipFailures));
      } else {
        cy.log('cy.checkA11y not available');
      }
    });
  });

  after(() => {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
    const meta = { generatedAt: new Date().toISOString(), enforced: enforce, pages: pages.length };
    const counts = Object.fromEntries(Object.entries(summary).map(([p, data]) => [p, data.count]));
    const asJson = JSON.stringify({ meta, counts, summary }, null, 2);
    cy.writeFile('cypress-results/a11y-header-summary.json', asJson, 'utf8');
    cy.writeFile(`test-report/${stamp}/a11y-header-summary.json`, asJson, 'utf8');
  });
});

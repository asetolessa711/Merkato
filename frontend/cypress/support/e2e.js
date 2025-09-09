import './commands';
import 'cypress-axe';
// cypress/support/e2e.js

// Import commands.js using ES2015 syntax:
import './commands';

// Silence/short-circuit noisy external calls (analytics, pixels, etc.) per test
const SILENCE_PATTERNS = [
  /google-analytics\.com/i,
  /www\.googletagmanager\.com/i,
  /analytics\.facebook\.com/i,
  /connect\.facebook\.net/i,
  /hotjar\.com/i,
  /segment\.io/i,
];

// Global setup: Seed DB once before all tests if enabled
before(() => {
  cy.log('🚀 Cypress Test Suite Started');
  if (Cypress.env('SEED_DB')) {
    cy.task('db:seed').then((result) => {
      if (result && result.error) {
        throw new Error('DB seeding failed');
      }
    });
  }
});

// Optional: Per-test setup (enforce data-testid guidance, clear noise)
beforeEach(() => {
  // Prefer data-testid selectors; warn if tests query by brittle selectors (best-effort heuristic)
  // Note: We cannot rewrite tests here, but this acts as guidance in console output.
  Cypress.log({ name: 'selector-policy', message: 'Prefer [data-testid] selectors for stability.' });
  // Register silencing intercepts
  SILENCE_PATTERNS.forEach((p) => {
    cy.intercept({ url: p }, { statusCode: 204, body: '' }).as('silenced');
  });
});

after(() => {
  cy.log('🏁 Cypress Test Suite Finished');
});

// Utility: tag-based filtering support (e.g., @flaky). Usage: add in spec titles.
// Exclude via CYPRESS_EXCLUDE_TAG="@flaky"; include-only via CYPRESS_INCLUDE_TAG="@flaky".
const excludeTag = (Cypress.env('EXCLUDE_TAG') || '').toString();
const includeTag = (Cypress.env('INCLUDE_TAG') || '').toString();
if (excludeTag || includeTag) {
  const origIt = it;
  // Replace global it with a safe wrapper; use origIt.skip to mark as pending at definition time
  // @ts-ignore
  // eslint-disable-next-line no-global-assign
  it = (title, fn) => {
    const hasTitle = typeof title === 'string' ? title : '';
    const shouldInclude = includeTag ? hasTitle.includes(includeTag) : true;
    const shouldExclude = excludeTag ? hasTitle.includes(excludeTag) : false;
    if (!shouldInclude || shouldExclude) {
      return origIt.skip(title || '(skipped by tag filter)');
    }
    return origIt(title, fn);
  };
}

// cypress/support/e2e.js
import './commands';
import 'cypress-axe';
// Optional tag filtering: load cypress-grep if present
let __grepLoaded = false;
try {
  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  require('cypress-grep');
  __grepLoaded = true;
} catch (_) {
  __grepLoaded = false;
}

// Silence/short-circuit noisy external calls (analytics, pixels, etc.) per test
const SILENCE_PATTERNS = [
  /google-analytics\.com/i,
  /www\.googletagmanager\.com/i,
  /analytics\.facebook\.com/i,
  /connect\.facebook\.net/i,
  /hotjar\.com/i,
  /segment\.io/i,
];

// Track whether we've registered intercepts for this spec file
let __silenceInterceptorsRegistered = false;

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

  // Register silencing intercepts only once per spec
  if (!__silenceInterceptorsRegistered) {
    SILENCE_PATTERNS.forEach((p) => {
      cy.intercept({ url: p }, { statusCode: 204, body: '' }).as('silenced');
    });
    __silenceInterceptorsRegistered = true;
  }
});

after(() => {
  cy.log('🏁 Cypress Test Suite Finished');
});

// Tag filtering via cypress-grep
// Usage:
//  - Include only: set env CYPRESS_INCLUDE_TAG="a11y" (or comma/space separated)
//  - Exclude: set env CYPRESS_EXCLUDE_TAG="flaky,negative" (will invert grep)
//  - We normalize to @tag format for titles containing e.g. "@a11y"
(() => {
  const normalizeTags = (csv) => String(csv || '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith('@') ? s : `@${s}`));

  const includeRaw = Cypress.env('INCLUDE_TAG');
  const excludeRaw = Cypress.env('EXCLUDE_TAG');

  if (includeRaw) {
    const tags = normalizeTags(includeRaw).join(',');
    // cypress-grep reads grepTags/invert
    Cypress.env('grepTags', tags);
    Cypress.env('invert', false);
    if (!__grepLoaded) {
      // eslint-disable-next-line no-console
      console.warn('[grep] INCLUDE_TAG provided but cypress-grep is not installed; tag filtering will be ignored.');
    }
  } else if (excludeRaw) {
    const tags = normalizeTags(excludeRaw).join(',');
    Cypress.env('grepTags', tags);
    Cypress.env('invert', true);
    if (!__grepLoaded) {
      // eslint-disable-next-line no-console
      console.warn('[grep] EXCLUDE_TAG provided but cypress-grep is not installed; tag filtering will be ignored.');
    }
  }
})();
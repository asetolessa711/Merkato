
// cypress/support/e2e.js
import './commands';
import 'cypress-axe';

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

// Utility: tag-based filtering support (e.g., @flaky). Usage: add in spec titles.
// Exclude via CYPRESS_EXCLUDE_TAG="@flaky"; include-only via CYPRESS_INCLUDE_TAG="@flaky".
const splitTags = (value) => String(value || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
const excludeTags = splitTags(Cypress.env('EXCLUDE_TAG'));
const includeTags = splitTags(Cypress.env('INCLUDE_TAG'));

// Guard to avoid re-wrapping in case this file is evaluated more than once in the same run
const TAG_WRAPPER_FLAG = '__MERKATO_IT_TAG_WRAPPED__';
if ((excludeTags.length || includeTags.length) && !globalThis[TAG_WRAPPER_FLAG]) {
  // Mark as wrapped before assigning to avoid races
  Object.defineProperty(globalThis, TAG_WRAPPER_FLAG, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  const origIt = globalThis.it;
  const origItBase = typeof origIt === 'function' ? origIt.bind(globalThis) : null;
  const origItOnly = origIt && typeof origIt.only === 'function' ? origIt.only.bind(globalThis) : null;
  const definePending = (title) => (origItBase ? origItBase(title || '(skipped by tag filter)') : undefined);

  const makeBound = (base) => function wrapped(title, ...rest) {
    const t = typeof title === 'string' ? title : '';
    const shouldInclude = includeTags.length ? includeTags.some((tag) => t.includes(tag)) : true;
    const shouldExclude = excludeTags.length ? excludeTags.some((tag) => t.includes(tag)) : false;
    if (!shouldInclude || shouldExclude) {
      // Define as pending to avoid recursive skip wrappers in some Cypress/Mocha internals.
      return definePending(title);
    }
    return base ? base(title, ...rest) : undefined;
  };

  // Replace global it with a safe wrapper and preserve it.only/skip
  if (origItBase) {
    // eslint-disable-next-line no-global-assign
    globalThis.it = makeBound(origItBase);
    if (origItOnly) globalThis.it.only = makeBound(origItOnly);
    if (origIt && typeof origIt.skip === 'function') {
      globalThis.it.skip = origIt.skip.bind(globalThis);
    }
  }
}
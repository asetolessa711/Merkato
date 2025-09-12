// Tags: @thread:checkout @a11y
// Critical-only a11y check for Checkout form with items in cart

/// <reference types="cypress" />
import 'cypress-axe';

const SUMMARY_FILE = 'a11y-checkout-summary.json';

function writeSummary(counts, meta = {}) {
  const payload = { counts, meta: { ...meta, suite: 'checkout' } };
  cy.writeFile(`cypress-results/${SUMMARY_FILE}`, payload, { log: false });
}

describe('♿ A11y — Checkout form', () => {
  const counts = { '/checkout': 0 };
  const ENFORCE = Cypress.env('A11Y_ENFORCE') === true || Cypress.env('A11Y_ENFORCE') === 'true';

  before(() => {
    // Seed backend and ensure at least one item in cart
    cy.request('POST', `${Cypress.env('API_URL') || 'http://localhost:5051'}/api/dev/seed`).its('status').should('eq', 200);
    // add a known product to cart via UI on /shop to ensure checkout content renders
    cy.visit('/shop');
    cy.injectAxe();
    // Click first Add to Cart button heuristic
    cy.contains(/add to cart|add|cart/i).first().click({ force: true });
  });

  it('has no critical violations on /checkout @a11y', () => {
    cy.visit('/checkout');
    cy.injectAxe();
    cy.checkA11y(undefined, {
      includedImpacts: ['critical'],
    }, (violations) => {
      counts['/checkout'] = violations.length;
      writeSummary(counts, { enforced: ENFORCE });
      if (ENFORCE && violations.length) {
        const names = violations.map(v => v.id).join(', ');
        throw new Error(`Critical a11y violations on /checkout: ${names}`);
      }
    });
  });
});

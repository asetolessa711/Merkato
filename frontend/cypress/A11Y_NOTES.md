Accessibility (a11y) E2E checks

- Specs: cypress/e2e/a11y_smoke.cy.js, a11y_auth_pages.cy.js, a11y_product_detail.cy.js
- Default behavior: observe only (log violations, do not fail).
- Control via env:
  - A11Y_ENFORCE=true: fail the test on critical violations.
  - A11Y_SKIP=true: skip all a11y tests (useful in time-budgeted jobs).
- Artifacts:
  - a11y_smoke writes cypress-results/a11y-summary.json (also under test-report/<stamp>/).
  - a11y_auth_pages writes cypress-results/a11y-auth-summary.json.

Suggested CI wiring:
  - Keep a dedicated job that runs only a11y specs with A11Y_ENFORCE=false initially.
  - Flip to A11Y_ENFORCE=true once violations are under control.

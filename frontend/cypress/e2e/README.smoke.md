# Smoke Suite

Run this fast, stable subset locally:

```sh
cd frontend
E2E_SPEC=cypress/e2e/basic_navigation.cy.js,cypress/e2e/cart_checkout_button.cy.js,cypress/e2e/login_error.cy.js,cypress/e2e/card_intent.cy.js npm run e2e:run
```

Guidelines:
- Use only data-testid selectors.
- Intercept analytics/noisy external calls.
- Prefer deterministic payment paths (COD or Stripe test mode with intercepts).
- Keep each spec < 30s on CI.
- Tag flaky tests with `@flaky` and keep them out of the PR smoke gate.

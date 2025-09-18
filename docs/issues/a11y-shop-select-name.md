# A11y: /shop select missing accessible name (axe: select-name)# A11y: /shop select missing accessible name (axe: select-name)

- Route: /shop- Route: /shop

- Rule: select-name (critical)- Rule: select-name (critical)

- Help: Select element must have an accessible name- Help: Select element must have an accessible name

- Help URL: https://dequeuniversity.com/rules/axe/4.10/select-name?application=axeAPI- Help URL: https://dequeuniversity.com/rules/axe/4.10/select-name?application=axeAPI

- Detected by: cypress-axe (a11y_smoke.cy.js)- Detected by: cypress-axe (a11y_smoke.cy.js)

- Evidence: a11y-summary.json recorded 1 node on /shop- Evidence: a11y-summary.json recorded 1 node on /shop



## Impact## Impact

Screen reader users could not perceive the purpose of the vendor filter dropdown.Screen reader users could not perceive the purpose of the vendor filter dropdown.



## Fix Applied## Fix Applied

Add an accessible name to the vendor filter <select> via `aria-label="Filter products by vendor"` in `src/pages/ShopPage.js`.Add an accessible name to the vendor filter <select> via `aria-label="Filter products by vendor"` in `src/pages/ShopPage.js`.



## Acceptance Criteria## Acceptance Criteria

- Run the focused a11y smoke: only critical checks on '/', '/shop', '/cart', '/checkout'.- Run the focused a11y smoke: only critical checks on '/', '/shop', '/cart', '/checkout'.

- /shop has 0 critical violations for `select-name`.- /shop has 0 critical violations for `select-name`.

- `frontend/cypress-results/a11y-summary.json` no longer lists `select-name` under "/shop".- `frontend/cypress-results/a11y-summary.json` no longer lists `select-name` under "/shop".



## Validation Notes## Validation Notes

If we prefer a visible label, replace `aria-label` with a `<label htmlFor>` + `id` on the `<select>`.If we prefer a visible label, replace `aria-label` with a `<label htmlFor>` + `id` on the `<select>`.


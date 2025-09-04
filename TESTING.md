# Merkato Test Commands (Frontend, Backend, E2E)

This is a quick, Windows-friendly guide to run all tests for Merkato. See `docs/PROJECT_BOUNDARIES.md` to keep configs isolated from other projects (use MERKATO_* envs only).

## TL;DR

- Run everything (frontend → backend → E2E):
  - At repo root: `npm run test:all`
  - Or in VS Code: Task “Run all tests (backend, frontend, e2e)”
- Run only backend: `npm run test:backend`
- Run only frontend: `npm run test:frontend`
- Run only E2E (full suite): `npm run test:e2e`
- Filter E2E by spec(s): `npm run test:e2e -- --spec cypress/e2e/smoke.cy.js`

Notes
- All commands are safe in Windows PowerShell (the default in this repo).
- The E2E runner seeds test data and serves the built frontend automatically.
- The E2E runner ignores stray env overrides (like CYPRESS_spec) so full suite runs by default unless you pass `--spec`.

---

## Root-level commands

- Run full test pipeline (frontend → backend → e2e):
  - `npm run test:all`
    - Uses `scripts/run-all-tests.js` to run suites in sequence; exits on first failure.
    - Optional: filter Cypress specs: `npm run test:all -- --spec cypress/e2e/smoke.cy.js`

- Individual suites:
  - Backend: `npm run test:backend`
  - Frontend: `npm run test:frontend`
  - E2E: `npm run test:e2e` (delegates to frontend E2E runner)

## Backend (Jest + Supertest)

- Run tests: `npm run test:backend`
- Debug long asyncs: from `backend/`, `npm run test:debug` (adds `--detectOpenHandles`)
- Seed (manual): from `backend/`, `npm run seed:test` (hits `POST /api/dev/seed` on port 5000)

Environment
- Backend tests load `.env.test`/`.env.test.local` if present.
- Some VS Code tasks set `JEST_CLOSE_DB=true` to ensure graceful teardown.

## Frontend (Jest + React Testing Library)

- Run tests: `npm run test:frontend`
- From `frontend/`: `npm test` runs with `CI=true`, jsdom env, and no watch.

## End-to-End (Cypress)

Primary
- Run full suite: `npm run test:e2e`
  - Seeds DB, builds app with the correct API URL, serves static build, runs Cypress headless.

From `frontend/` directly
- Headless full run: `npm run e2e:run` (alias: `npm run cy:run`)
- Open Cypress UI: `npm run cy:open`
- Useful subsets:
  - Core flows: `npm run e2e:core`
  - Checkout flows: `npm run e2e:checkout`

Spec filtering
- Run a single spec: `npm run test:e2e -- --spec cypress/e2e/smoke.cy.js`
- Multiple specs (comma-separated):
  `npm run test:e2e -- --spec cypress/e2e/basic_navigation.cy.js,cypress/e2e/shop_visibility.cy.js`

Behavior
- The E2E runner sanitizes foreign env (e.g., `CYPRESS_spec`) so it won’t accidentally run only one spec unless you explicitly pass `--spec`.
- Dynamic ports are used to avoid conflicts; the runner logs the seeded URL and the Cypress baseUrl.

## VS Code tasks (recommended)

- Run: “Run all tests (backend, frontend, e2e)”
  - Calls `npm run test:all` directly (PowerShell-safe). No JSON parsing of scripts.
- Additional scoped tasks exist for backend/frontend/E2E if you prefer UI-driven runs.

## Seeding and fixtures

- Dev seed endpoint: `POST /api/dev/seed` on backend (port will differ in E2E; the runner prints it).
- Seed includes deterministic users (admin/vendor/customer) and products; passwords are set plainly and hashed by model pre-save.
- Cypress uploads use test images from repo; backend tests restore a test image via `jest` globalSetup.

## Project boundaries

- See `docs/PROJECT_BOUNDARIES.md`.
- Use `MERKATO_*` env vars only in this repo.
- For test emails, set `MERKATO_TEST_EMAIL_TO` instead of hardcoding addresses.

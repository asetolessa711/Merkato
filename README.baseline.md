Baseline v1.0.1 — CI + E2E Setup

Summary
- Tagged `v1.0.1` on `origin/main` to capture a green baseline.
- E2E (GitHub Actions) now uses file-based env: the workflow copies `backend/.env.test` to `backend/.env` and forces `MONGO_URI=mongodb://localhost:27017/merkato_test` so tests use the job’s Mongo service.
- Removed dependency on Actions secrets for E2E. Secrets can be added later if desired.
- Secret hygiene tightened: `backend/.env` is ignored; `backend/.env.example` provides sanitized placeholders.
- TESTING.md updated with CI/E2E notes and hygiene guidance.

How to Run
- Local E2E: `cd frontend && npm run cy:open` (or `npm run cy:run`). Ensure backend is running or run the e2e scripts that start it.
- CI: Push any commit to a branch that matches the workflow triggers (e.g., `main`, `dev`, `feat/**`).

Optional Next Steps
- Add Actions secrets if you prefer secrets-based configuration for CI (TEST_MONGO_URI, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, EMAIL_USER, EMAIL_PASS).
- Rotate any credentials that have ever been pushed or shared in plain text (JWT secret, Stripe keys, email creds, OpenAI key, Mongo user/pass). Update your local `.env` and `.env.test` accordingly.

Notes
- Avoid printing env values in logs. The workflows do not echo sensitive variables.
- If migrating back to secrets, reintroduce them under the `env:` block of the backend start step in `.github/workflows/e2e-cypress.yml`.


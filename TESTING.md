# Testing Instructions for Merkato

## Frontend

### Unit & Integration Tests (Jest)
- Run all tests:
  ```sh
  cd frontend
  npm install
  npm test
  ```

### End-to-End Tests (Cypress)
- Open Cypress UI:
  ```sh
  npm run cy:open
  ```
- Run all E2E tests headlessly:
  ```sh
  npm run cy:run
  ```

## Backend

### Unit & Integration Tests (Jest/Supertest)
- Run all backend tests:
  ```sh
  cd backend
  npm install
  npm test
  ```
- Seed test data (if needed):
  ```sh
  npm run test:seed
  ```

## Notes
- Cypress is only configured for the frontend.
- Make sure backend is running before running Cypress E2E tests.
- Ensure `.env.test` files exist for backend tests if needed.
- For manual test seeding and running, see scripts in each `package.json`.

## CI and E2E (GitHub Actions)
- E2E workflow loads env from file: the pipeline copies `backend/.env.test` to `backend/.env` before starting the server.
- Mongo in CI: the workflow then forces `MONGO_URI=mongodb://localhost:27017/merkato_test` so tests use the job’s Mongo service.
- Secrets: E2E no longer requires GitHub Actions secrets. If you prefer secrets-based config, add `TEST_MONGO_URI`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `EMAIL_USER`, `EMAIL_PASS` in the repo’s Actions Secrets and wire them into the workflow.
- Hygiene: `backend/.env` is ignored; use `backend/.env.example` as the template and never commit real credentials. If a secret was ever pushed, rotate it.

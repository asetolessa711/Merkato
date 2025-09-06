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
- Windows-fast headless run (ephemeral DB, auto-clean):
  ```sh
  cd frontend
  npm run e2e:fast:win
  ```
- Attach to already running dev servers (developer desktop):
  ```sh
  cd frontend
  # Ensure: backend on 5051, frontend on 3000 (craco); then
  npm run e2e:attach:core
  ```
- Full headless run (build-and-serve orchestrated):
  ```sh
  cd frontend
  npm run e2e:run
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

### MongoDB for Local Tests
- Start a local MongoDB before running backend tests (Windows Service recommended). If you prefer containers, you can use Docker, but our default flow no longer relies on it.
- The project defaults to `mongodb://127.0.0.1:27017` to avoid IPv6 `::1` connection issues on Windows.
- Test environment file: `backend/.env.test` sets `MONGO_URI=mongodb://127.0.0.1:27017/merkato_test`.

## Notes
- Cypress is only configured for the frontend.
- Make sure backend is running before running Cypress E2E tests.
- Ensure `.env.test` files exist for backend tests if needed.
- For manual test seeding and running, see scripts in each `package.json`.

## Notes on local setup
Containerized setups are optional and not required for the current workflow. The default path is local services (MongoDB as a Windows Service is recommended on Windows) plus the provided E2E runner modes.

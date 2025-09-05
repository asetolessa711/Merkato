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

### MongoDB for Local Tests
- Start a local MongoDB before running backend tests.
  - Windows Service: start the MongoDB service from Services, or
  - Docker: `docker run --rm -p 27017:27017 mongo:5`
- The project defaults to `mongodb://127.0.0.1:27017` to avoid IPv6 `::1` connection issues on Windows.
- Test environment file: `backend/.env.test` sets `MONGO_URI=mongodb://127.0.0.1:27017/merkato_test`.

## Notes
- Cypress is only configured for the frontend.
- Make sure backend is running before running Cypress E2E tests.
- Ensure `.env.test` files exist for backend tests if needed.
- For manual test seeding and running, see scripts in each `package.json`.

## E2E via Docker (Windows-safe, isolated)
- Prereq: Docker Desktop installed and running.
- Run headless E2E with Dockerized Cypress (no local binary):
  ```sh
  # From repo root; script starts backend + serves frontend, then runs Cypress in Docker
  npm --prefix frontend run cy:run:docker
  ```
  The script mounts only the `frontend/` folder into the Cypress container and targets your locally served app via `host.docker.internal`. This avoids cross‑project cache contamination and Windows binary issues.

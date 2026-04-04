# Testing Instructions for Merkato

## Frontend

### Unit & Integration Tests (Jest)
- Run all tests:
  ```sh
  cd frontend
  npm install
  npm test
  ```

#### Axios mocking standard (important)
- We use a single global manual mock for `axios` activated in `frontend/src/setupTests.js` and implemented at `frontend/src/__mocks__/axios.js`.
- All axios methods (get/post/put/patch/delete/create) always return Promises. This contract is locked by `frontend/src/__tests__/unit/__meta__/axios.global-mock.contract.test.js`.
- In tests, do not write `jest.mock('axios')`. Instead, import axios normally and set per-test overrides, for example:
  - `axios.get.mockResolvedValueOnce({ data: [] })`
  - `axios.post.mockRejectedValueOnce(new Error('fail'))`
- This avoids ESM/CJS interop issues and keeps behavior consistent across all suites.

#### Jest fake timers: best practices
- Prefer fake timers for components with debounce/throttle, polling, or setTimeout/setInterval usage.
- Setup and cleanup per test:
  - `beforeEach(() => jest.useFakeTimers());`
  - `afterEach(() => jest.useRealTimers());`
- Advance time inside React act to flush updates:
  - `await act(async () => { jest.advanceTimersByTime(250); });`
- Flush pending microtasks between timer advances (for Promises/async effects):
  - `await act(async () => { await Promise.resolve(); });`
- Avoid `jest.runAllTimers()` in React 18 + RTL; prefer targeted `advanceTimersByTime` with act to avoid state update warnings.
- If a test relies on real Date.now or performance.now behavior, temporarily switch to real timers for that test and restore afterward.

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
- Canonical database names:
  - Dev: `merkato-dev`
  - Test: `merkato_test`
  - E2E: `merkato_e2e`
- Test environment should use `MONGO_URI_TEST=mongodb://127.0.0.1:27017/merkato_test`.

Repository-driven bootstrap commands:

```sh
npm run db:bootstrap:dev
npm run db:bootstrap:test
npm run db:bootstrap:e2e
```

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

## CI E2E Gates and Ops

- PR Smoke Gate: `.github/workflows/pr-smoke-gate.yml`
  - Runs a small, stable subset on every PR.
  - Fails if any spec fails or if total runtime exceeds 5 minutes.
  - Retries enabled only on CI via `CYPRESS_retries=2`.
  - Quarantine with `@flaky` tag. Excluded on PRs via `CYPRESS_EXCLUDE_TAG=@flaky`.
  - Nightly job runs only `@flaky` tests: `.github/workflows/nightly-flaky.yml` using `CYPRESS_INCLUDE_TAG=@flaky`.
  - Artifacts: screenshots, videos (CI only), backend logs, cypress-results JSON, and `e2e-meta.txt` (DB/API used).

- Spec splitting for parallelization:
  - Set `E2E_SPLIT_TOTAL` to number of workers and `E2E_SPLIT_INDEX` (0-based) per job.
  - Each shard gets its own ephemeral DB (when `E2E_EPHEMERAL=true`).

- Seeding options:
  - Runner seeds once per run via `/api/dev/seed`.
  - Enable per-spec seeding by setting `CYPRESS_SEED_PER_SPEC=true` or Cypress `env.SEED_PER_SPEC`.

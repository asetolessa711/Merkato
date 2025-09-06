E2E Strategy and Runner Modes

Overview
- Goal: Fast local feedback, deterministic CI/beta runs, and minimal flake — without changing backend or core frontend logic.
- Recommended modes for Merkato:
  - Local Dev: Attach Mode + Seed (fastest iteration).
  - Beta/CI: Build-and-Serve + Ephemeral DB per run (clean state, reproducible).
  - Production Gating: small smoke suite against staging (Build-and-Serve), never against production DB.

Modes
- Attach Mode
  - What: You run backend and frontend dev servers; Cypress attaches to them.
  - Best for: Daily development and reproducing UI bugs.
  - Pros: No build step; mirrors developer workflow.
  - Cons: State drift unless seeded; relies on local env health.
  - How (manual):
    1) Backend: `MONGO_URI=mongodb://127.0.0.1:27017/merkato_dev npm --prefix backend run start:5051`
    2) Frontend: `npm --prefix frontend run start:3000`
    3) Cypress: `CYPRESS_API_URL=http://localhost:5051 npx cypress run --config baseUrl=http://localhost:3000`
  - How (runner, attach mode):
    - `E2E_ATTACH=true E2E_BASE_URL=http://localhost:3000 E2E_API_URL=http://localhost:5051 node frontend/scripts/run-e2e.js`
    - The runner seeds via `/api/dev/seed` and runs Cypress against your dev servers.

- Build-and-Serve Mode (CI-friendly)
  - What: The runner starts backend, seeds DB, builds the frontend, serves it on a free port, then runs Cypress.
  - Best for: Beta testing and CI.
  - Pros: Deterministic and closer to production asset pipeline.
  - Cons: Build overhead; requires simple orchestration (provided by the runner).
  - How: `npm --prefix frontend run e2e:run` (or `e2e:core` for a subset).

- Ephemeral DB per Run
  - What: The runner generates a unique Mongo database name per run to eliminate cross-run data contamination.
  - How: Set `E2E_EPHEMERAL=true` (works when the runner starts the backend — not in pure attach).
  - Env:
    - `E2E_DB_PREFIX` (default `merkato_e2e`) → final DB name looks like `merkato_e2e-<pid>-<timestamp>-<rand>`.
  - Cleanup:
    - Auto-drop: set `E2E_AUTODROP=true` to drop the ephemeral DB automatically at the end of the run (uses the backend's installed `mongodb` driver; no new dependency added to frontend).
    - Manual: if auto-drop fails or is disabled, drop manually:
      - `mongo --eval "db.getMongo().getDB('<db>').dropDatabase()"`

Choosing the Right Mode
- Local Dev (fast loop): Attach Mode + seed via `cy.task('db:seed')` or POST `/api/dev/seed`.
- Beta/CI (deterministic): Build‑and‑Serve + `E2E_EPHEMERAL=true`.
- Production: Small smoke against staging; do not point to production DB.

Runner Environment Variables
- `E2E_ATTACH`: `true` to attach to already running servers (skip backend start and build/serve).
- `E2E_BASE_URL`: Frontend base URL in attach mode (default `http://localhost:3000`).
- `E2E_API_URL`: Backend base URL in attach mode (default `http://localhost:5051`).
- `E2E_EPHEMERAL`: `true` to use a unique DB per run (only when the runner starts the backend).
- `E2E_DB_PREFIX`: Prefix for ephemeral DBs (default `merkato_e2e`).
- `E2E_AUTODROP`: `true` to automatically drop the ephemeral DB at the end of the run (non-attach runs only).
- `E2E_SPEC`: Comma-separated Cypress spec(s) to run.

Examples
- Attach Mode, full suite:
  `E2E_ATTACH=true E2E_BASE_URL=http://localhost:3000 E2E_API_URL=http://localhost:5051 node frontend/scripts/run-e2e.js`

- Build‑and‑Serve, core subset with ephemeral DB:
  `E2E_EPHEMERAL=true E2E_SPEC=cypress/e2e/basic_navigation.cy.js,cypress/e2e/checkout_payment.cy.js npm --prefix frontend run e2e:run`

Notes
- Docker Compose is optional and not required for the current workflow.
- A Mongo memory server is unnecessary for this project’s E2E goals; we prefer real Mongo for parity.

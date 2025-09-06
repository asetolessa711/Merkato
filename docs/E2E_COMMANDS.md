E2E Commands Cheat Sheet

Prereqs
- Backend dev server (optional for attach/semi-attach): `npm --prefix backend run start:5051`
- Frontend dev server (optional for attach/semi-attach): `npm --prefix frontend run start:3000`

Attach Mode (reuse both backend and frontend)
- Full run (uses your running servers):
```
E2E_ATTACH=true \
E2E_BASE_URL=http://localhost:3000 \
E2E_API_URL=http://localhost:5051 \
node frontend/scripts/run-e2e.js
```
- NPM script:
```
npm --prefix frontend run e2e:attach
```
- Single spec:
```
E2E_ATTACH=true E2E_BASE_URL=http://localhost:3000 E2E_API_URL=http://localhost:5051 \
E2E_SPEC=cypress/e2e/basic_navigation.cy.js \
node frontend/scripts/run-e2e.js
```

Semi‑Attach Mode (runner starts backend with optional ephemeral DB; reuses your frontend dev server)
- Start backend with clean DB per run and reuse dev frontend:
```
E2E_SEMI_ATTACH=true E2E_EPHEMERAL=true E2E_AUTODROP=true \
E2E_BASE_URL=http://localhost:3000 E2E_BACKEND_PORT=5000 \
node frontend/scripts/run-e2e.js
```
- NPM script:
```
npm --prefix frontend run e2e:semi
```
- Pin DB prefix and run subset:
```
E2E_SEMI_ATTACH=true E2E_EPHEMERAL=true E2E_DB_PREFIX=merkato_e2e \
E2E_BASE_URL=http://localhost:3000 E2E_BACKEND_PORT=5000 \
E2E_SPEC=cypress/e2e/checkout_payment.cy.js,cypress/e2e/frictionless_checkout.cy.js \
node frontend/scripts/run-e2e.js
```

Note: Semi‑Attach uses port 5000 by default for the backend (or `E2E_BACKEND_PORT`) to match CRA dev proxy in `frontend/package.json` (`"proxy": "http://localhost:5000"`). This ensures the app’s relative `/api/...` requests hit the correct backend during tests.

Build‑and‑Serve (CI/Beta)
- Full suite:
```
npm --prefix frontend run e2e:run
```
- Core subset with ephemeral DB & auto‑drop:
```
E2E_EPHEMERAL=true E2E_AUTODROP=true \
E2E_SPEC=cypress/e2e/basic_navigation.cy.js,cypress/e2e/checkout_payment.cy.js \
npm --prefix frontend run e2e:run
```

Misc
- Cypress GUI against dev servers:
```
cd frontend
BASE_URL=http://localhost:3000 CYPRESS_API_URL=http://localhost:5051 npx cypress open
```
- Drop ephemeral DB manually (if needed):
```
mongo --eval "db.getMongo().getDB('<dbName>').dropDatabase()"
```

Script Variants (npm)
- Attach core subset:
```
npm --prefix frontend run e2e:attach:core
```
- Attach checkout subset:
```
npm --prefix frontend run e2e:attach:checkout
```
- Semi‑Attach core subset:
```
npm --prefix frontend run e2e:semi:core
```
- Semi‑Attach checkout subset:
```
npm --prefix frontend run e2e:semi:checkout
```

Admin‑only subsets
- Attach admin subset:
```
npm --prefix frontend run e2e:attach:admin
```
- Semi‑Attach admin subset:
```
npm --prefix frontend run e2e:semi:admin
```
- Build‑and‑Serve admin subset:
```
npm --prefix frontend run e2e:admin
```

Vendor‑only subsets
- Attach vendor subset:
```
npm --prefix frontend run e2e:attach:vendor
```
- Semi‑Attach vendor subset:
```
npm --prefix frontend run e2e:semi:vendor
```
- Build‑and‑Serve vendor subset:
```
npm --prefix frontend run e2e:vendor
```

Customer‑only subsets
- Attach customer subset:
```
npm --prefix frontend run e2e:attach:customer
```
- Semi‑Attach customer subset:
```
npm --prefix frontend run e2e:semi:customer
```
- Build‑and‑Serve customer subset:
```
npm --prefix frontend run e2e:customer
```

# Codespaces-First MongoDB Setup

This repository is configured so GitHub code is the source of truth for database structure and bootstrap data.

## Source-of-Truth Principle

- MongoDB is runtime storage only.
- Canonical data structure comes from repository code:
  - Mongoose models/schemas
  - schema indexes
  - repository bootstrap seed/config scripts
- Existing Mongo contents are not trusted by default.
- Use repository bootstrap commands to rebuild state from GitHub code.

## Canonical Database Names

- Development: `merkato-dev`
- Test: `merkato_test`
- E2E: `merkato_e2e`

Configured via environment variables:

- `MONGO_URI_DEV`
- `MONGO_URI_TEST`
- `MONGO_URI_E2E`

## Codespaces Runtime

Devcontainer files:

- `.devcontainer/devcontainer.json`
- `.devcontainer/docker-compose.yml`
- `.devcontainer/postCreate.sh`

MongoDB runs as service `mongo` inside the Codespaces compose network.

Default Codespaces URIs:

- `MONGO_URI=mongodb://mongo:27017/merkato-dev`
- `MONGO_URI_DEV=mongodb://mongo:27017/merkato-dev`
- `MONGO_URI_TEST=mongodb://mongo:27017/merkato_test`
- `MONGO_URI_E2E=mongodb://mongo:27017/merkato_e2e`

## Repository-Driven Bootstrap Flow

Bootstrap scripts live in `backend/scripts/db/`:

- `bootstrap.js`: rebuilds canonical DB state from repo code
- `validate.js`: validates DB state against repo schema/index/seed expectations

Bootstrap does the following:

1. Loads canonical model files from `backend/models` (active model set)
2. Applies schema indexes from Mongoose definitions
3. Creates required bootstrap config docs (delivery/settings defaults)
4. Seeds canonical baseline users/products from repository definitions
5. Validates required indexes and bootstrap/seed state

## Commands

From repository root:

```bash
npm run db:bootstrap:dev
npm run db:bootstrap:test
npm run db:bootstrap:e2e

npm run db:validate:dev
npm run db:validate:test
npm run db:validate:e2e
```

Direct backend equivalents:

```bash
npm --prefix backend run db:bootstrap:dev
npm --prefix backend run db:bootstrap:test
npm --prefix backend run db:bootstrap:e2e

npm --prefix backend run db:validate:dev
npm --prefix backend run db:validate:test
npm --prefix backend run db:validate:e2e
```

## Fresh Codespace Reconstruction

A fresh Codespace runs `.devcontainer/postCreate.sh` automatically:

1. installs dependencies
2. bootstraps `merkato-dev` from repository code
3. validates resulting DB state

Then start services:

```bash
npm run dev
```

This runs frontend and backend inside Codespaces, with backend defaulting to canonical dev Mongo URI.

## Testing and E2E Notes

- Jest uses canonical test DB (`merkato_test`) via `MONGO_URI_TEST` fallback logic.
- E2E defaults to canonical `merkato_e2e` naming (`E2E_DB_PREFIX=merkato_e2e`).
- If needed, rebuild test/e2e DBs before runs:

```bash
npm run db:bootstrap:test
npm run db:bootstrap:e2e
```

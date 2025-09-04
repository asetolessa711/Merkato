# Baseline Guardrails

This repo uses a test baseline to guard against regressions.

- Record baseline (backend):
  - From repo root: `npm run test:backend:baseline:record`
  - Stable (multi-run) record: `npm run test:backend:baseline:record:stable`
- Verify baseline (backend):
  - From repo root: `npm run test:backend:baseline:verify`

CI will verify the backend baseline on every push and PR. Ensure products are seeded locally; scripts run seeds automatically.

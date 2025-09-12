# E2E Tagging Guide

This project uses tags in Cypress test titles to control selection and speed up CI.

## Core tags

- @smoke: Fast, stable tests for PR gating.
- @flaky: Known-unstable tests. Excluded from PR smoke by default.
- @admin, @vendor, @buyer: Role-based scopes.
- @orders, @checkout, @a11y: Feature areas.
- @negative: Negative-path assertions.
- @api: API-level tests.
- Advanced (optional):
  - @persona:vendor, @persona:buyer: Behavioral flows by persona.
  - @thread:checkout, @thread:returns: Cross-spec threads.

Tags appear in describe/it titles, e.g.:

describe('Smoke - Checkout @smoke @checkout @persona:buyer', () => { /* ... */ })

## Running filtered tests locally

- PR smoke set (include @smoke, exclude @flaky):
  - From `frontend/`: `npm run e2e:pr:smoke`

- Include specific tags:
  - PowerShell: `$env:CYPRESS_INCLUDE_TAG='admin,orders'; node ./scripts/run-e2e.js`

- Exclude tags:
  - PowerShell: `$env:CYPRESS_EXCLUDE_TAG='flaky,negative'; node ./scripts/run-e2e.js`

Notes:
- Tag matching is powered by cypress-grep. INCLUDE_TAG/EXCLUDE_TAG envs are mapped to grepTags.
- Tags normalize to @tag (no need to include the @ in env values).

## CI strategy

- Pull Requests: runner invoked with `--pr-smoke` (or auto-detected in CI), which:
  - Includes @smoke
  - Excludes @flaky
  - Runs against a clean, ephemeral DB when configured

- Overrides:
  - Include custom tag(s): set `CYPRESS_INCLUDE_TAG`.
  - Exclude custom tag(s): set `CYPRESS_EXCLUDE_TAG`.
  - Disable smoke defaults: omit `--pr-smoke`. (Env-only `PR_SMOKE=true` is deprecated; always prefer the flag.)

## Tag audit and visibility

- Generate a tag inventory report:
  - From `frontend/`: `npm run e2e:tag-audit`
  - Outputs JSON and Markdown with tag counts per spec.

- PR auto-comment (optional):
  - After a run, generate `frontend/pr-comment.md` with selected tags and pass/fail summary:
    - From `frontend/`: `npm run e2e:pr:comment`
  - In CI, post this file to the PR with your chosen GitHub Actions step.

## Conventions

- Prefer data-testid selectors to keep tests stable.
- Keep @smoke small and reliable; move slower paths to full/nightly runs.
- Use @flaky sparingly and fix or quarantine quickly.

## Provisional flows

Returns/Refunds lifecycle (@refunds @smoke) currently runs as a single consolidated UI simulation test using localStorage state injection (no dedicated backend returns API yet). Once real endpoints exist, this should be split into granular role-scoped specs (customer request, admin approve, vendor process) while keeping only the fastest happy-path in @smoke.

# E2E Local Usage (Simple, Cross-Platform)

## Single Spec (recommended during stabilization)
PowerShell / Bash (same env style via cross-env when using npm script):

```powershell
# From repo root or frontend folder
cd frontend
$env:SPEC='adminOrdersBulkActions.cy.js'; npm run e2e:spec
```

Or using full path:
```powershell
$env:SPEC='cypress/e2e/adminOrdersBulkActions.cy.js'; npm run e2e:spec
```

## Repeat a Spec N Times
```powershell
$env:SPEC='adminOrdersBulkActions.cy.js'; $env:RUNS='5'; npm run e2e:spec
```
Shortcut scripts:
```powershell
$env:SPEC='adminOrdersBulkActions.cy.js'; npm run e2e:spec:5
$env:SPEC='adminOrdersBulkActions.cy.js'; npm run e2e:spec:10
```

## Dry Run (just resolve spec, no execution)
```powershell
$env:SPEC='adminOrdersBulkActions.cy.js'; $env:DRY_RUN='true'; npm run e2e:spec
```

## Continue On Failure
```powershell
$env:SPEC='adminOrdersBulkActions.cy.js'; $env:RUNS='10'; $env:CONTINUE_ON_FAIL='true'; npm run e2e:spec
```

## Promote a Stabilized Spec to Smoke
1. Run it (no DRY_RUN) at least 3 consecutive times with RUNS=3.
2. If green, add `@smoke` tag in the spec.
3. Remove `@flaky` if it still exists.
4. Run PR smoke locally (curated 6-spec set):
```powershell
node scripts/run-e2e.js --pr-smoke
```
or via npm script:
```powershell
npm run e2e:pr:smoke
```
Confirm spec appears in `scope-report.txt`.

## Full Run Explicitly (all specs, ignoring prior env spec filters)
```powershell
Remove-Item Env:E2E_SPEC -ErrorAction SilentlyContinue
npm run e2e:run
```

## Notes
- Prefer setting env vars directly instead of nesting another `powershell -Command` invocation; avoids quoting/interpolation issues.
- `SPEC` (or `E2E_SPEC`) is normalized to a real path; you can omit `cypress/e2e/` and extension if the `.cy.js` file matches uniquely.
- `RUNS` aborts on first failure unless `CONTINUE_ON_FAIL=true`.
- Artifacts per run still land in `frontend/cypress-results` and timestamped `frontend/test-report/*`.

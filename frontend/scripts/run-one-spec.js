// Helper: run a single Cypress spec (optionally multiple times) using existing run-e2e.js orchestrator.
// Usage examples (PowerShell):
//   $env:SPEC='adminOrdersBulkActions.cy.js'; npm run e2e:one
//   $env:SPEC='cypress/e2e/adminOrdersBulkActions.cy.js'; $env:RUNS='3'; npm run e2e:one
//   $env:SPEC='adminOrdersBulkActions.cy.js'; $env:RUNS='5'; $env:DRY_RUN='true'; npm run e2e:one
// Supports SPEC, E2E_SPEC, or positional arg (node scripts/run-one-spec.js <spec>)
// RUNS (default 1) repeats sequentially; aborts on first failure unless CONTINUE_ON_FAIL=true.

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function resolveSpec(input) {
  if (!input) return null;
  const frontendDir = path.resolve(__dirname, '..');
  const specRoot = path.join(frontendDir, 'cypress', 'e2e');
  const isAbs = path.isAbsolute(input);
  const candidates = [];
  if (isAbs && fs.existsSync(input)) return normalize(frontendDir, input);
  // If already starts with cypress/ treat as relative to frontend root
  if (/^cypress[\\/]/i.test(input)) {
    const rel = path.join(frontendDir, input);
    if (fs.existsSync(rel)) return normalize(frontendDir, rel);
  }
  // Try under spec root
  const under = path.join(specRoot, input);
  if (fs.existsSync(under)) return normalize(frontendDir, under);
  // Try add .cy.js if missing
  if (!/\.cy\.[jt]sx?$/i.test(input)) {
    const withCy = path.join(specRoot, input.replace(/\.[jt]sx?$/,'') + '.cy.js');
    if (fs.existsSync(withCy)) return normalize(frontendDir, withCy);
  }
  return null;
}

function normalize(frontendDir, abs) {
  return path.relative(frontendDir, abs).replace(/\\/g,'/');
}

function main() {
  const specArg = process.env.SPEC || process.env.E2E_SPEC || process.argv[2];
  if (!specArg) {
    console.error('[e2e:one] ERROR: Provide SPEC env var or argument.');
    process.exit(2);
  }
  const resolved = resolveSpec(specArg);
  if (!resolved) {
    console.error(`[e2e:one] ERROR: Could not resolve spec '${specArg}'.`);
    process.exit(3);
  }
  const runs = Math.max(1, parseInt(process.env.RUNS || '1', 10));
  const dryRun = /^true$/i.test(String(process.env.DRY_RUN||''));
  const continueOnFail = /^true$/i.test(String(process.env.CONTINUE_ON_FAIL||''));
  console.log(`[e2e:one] Spec: ${resolved} | Runs: ${runs} | DryRun: ${dryRun}`);
  if (dryRun) { console.log('[e2e:one] DRY_RUN=true -> exiting before execution. Unset DRY_RUN to execute.'); return; }
  for (let i=1; i<=runs; i++) {
    console.log(`\n[e2e:one] Run ${i}/${runs} ...`);
    const env = { ...process.env, E2E_SPEC: resolved };
    const r = spawnSync('node', ['scripts/run-e2e.js'], { stdio: 'inherit', env });
    const code = r.status == null ? 1 : r.status;
    console.log(`[e2e:one] Run ${i} exit code: ${code}`);
    if (code !== 0 && !continueOnFail) {
      console.error('[e2e:one] Aborting further runs due to failure. Set CONTINUE_ON_FAIL=true to continue.');
      process.exit(code);
    }
  }
  console.log('[e2e:one] Completed requested runs.');
}

main();

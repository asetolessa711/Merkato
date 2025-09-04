/**
 * Verify that all previously passing test names (from baseline-passing.json)
 * still pass in the current Jest run. Fails with a clear diff if any regress.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = __dirname; // tests/utils
const backendRoot = path.resolve(cwd, '..', '..');
const outputFile = path.join(backendRoot, 'jest-results-verify.json');
const baselineFile = path.join(backendRoot, 'tests', 'utils', 'baseline-passing.json');

function runSeeders() {
  console.log('[baseline] Running seeders to match npm pretest...');
  const seeds = ['seedUsers.js', 'seedProducts.js', 'seedFeedback.js'];
  for (const s of seeds) {
    const scriptPath = path.join(backendRoot, s);
    if (fs.existsSync(scriptPath)) {
      const res = spawnSync(process.execPath, [scriptPath], { cwd: backendRoot, stdio: 'inherit' });
      if (res.status !== 0) {
        console.warn(`[baseline] Seeder ${s} exited with code ${res.status}`);
      }
    } else {
      console.warn('[baseline] Seeder not found:', scriptPath);
    }
  }
}

if (!fs.existsSync(baselineFile)) {
  console.error('[baseline] Missing baseline file:', baselineFile);
  console.error('Run `npm run test:baseline:record` once when stable to create it.');
  process.exit(1);
}

function runJestJson() {
  console.log('[baseline] Running Jest for verification...');
  const jestJs = path.join(backendRoot, 'node_modules', 'jest', 'bin', 'jest.js');
  const args = ['--config=./jest.config.backend.js', '--runInBand', '--json', `--outputFile=${outputFile}`];
  let res;
  if (fs.existsSync(jestJs)) {
    res = spawnSync(process.execPath, [jestJs, ...args], {
      cwd: backendRoot,
      env: { ...process.env, JEST_CLOSE_DB: 'true' },
      stdio: 'inherit',
      shell: false,
    });
  } else {
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    res = spawnSync(npxCmd, ['jest', ...args], {
      cwd: backendRoot,
      env: { ...process.env, JEST_CLOSE_DB: 'true' },
      stdio: 'inherit',
      shell: false,
    });
  }
  if (res.error) {
    console.error('[baseline] Failed to run jest:', res.error.message);
    process.exit(1);
  }
  // Ignore exit code; we only care to parse results
}

function extractPassingTestNames(resultJson) {
  const names = [];
  for (const suite of resultJson.testResults || []) {
    for (const assertion of suite.assertionResults || []) {
      if (assertion.status === 'passed') {
        const fullName = assertion.fullName || assertion.title;
        if (fullName) names.push(fullName);
      }
    }
  }
  return names.sort();
}

function main() {
  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  runSeeders();
  runJestJson();
  if (!fs.existsSync(outputFile)) {
    console.error('[baseline] Missing verification JSON:', outputFile);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  const passingNow = new Set(extractPassingTestNames(data));
  const missing = [];
  for (const name of baseline.tests) {
    if (!passingNow.has(name)) missing.push(name);
  }
  if (missing.length) {
    console.error(`\n[baseline] REGRESSION: ${missing.length} previously passing tests failed or didn\'t run.`);
    console.error('Examples (up to 20):');
    for (const m of missing.slice(0, 20)) console.error('  -', m);
    process.exit(1);
  }
  console.log(`[baseline] OK — All ${baseline.count} baseline-passing tests still pass.`);
}

main();

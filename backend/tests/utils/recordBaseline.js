/**
 * Record the current set of passing test names into a baseline file.
 * This guards against regressions by letting CI verify all previously
 * passing tests remain green.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = __dirname; // tests/utils
const backendRoot = path.resolve(cwd, '..', '..');
const outputFile = path.join(backendRoot, 'jest-results-latest.json');
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

function runJestJson() {
  console.log('[baseline] Running Jest to capture JSON results...');
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
  // Don't exit on non-zero code; we still want the JSON to parse what passed
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
  runSeeders();
  runJestJson();
  if (!fs.existsSync(outputFile)) {
    console.error('[baseline] Jest output JSON not found:', outputFile);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  const passing = extractPassingTestNames(data);
  // Keep only the first N to lock known-stable subset if needed; default all
  // Optionally filter by known suites if you want to lock exactly 184
  console.log(`[baseline] Captured ${passing.length} passing tests. Writing baseline...`);
  fs.writeFileSync(baselineFile, JSON.stringify({ recordedAt: new Date().toISOString(), count: passing.length, tests: passing }, null, 2));
  console.log('[baseline] Baseline written to', baselineFile);
}

main();

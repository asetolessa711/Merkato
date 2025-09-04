/**
 * Record a stable baseline by running Jest N times and intersecting passing tests.
 * Optionally cap the saved list to a target count (e.g., 184) to “protect 184 passes”.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..', '..');
const runs = Number(process.env.BASELINE_RUNS || 3);
const target = Number(process.env.BASELINE_TARGET || 184);
const outputs = Array.from({ length: runs }, (_, i) => path.join(backendRoot, `jest-results-run-${i + 1}.json`));
const baselineFile = path.join(backendRoot, 'tests', 'utils', 'baseline-passing.json');

function runSeeders() {
  console.log('[baseline] Running seeders to match npm pretest...');
  const { spawnSync } = require('child_process');
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

function runJestJson(outPath) {
  console.log(`[baseline] Running Jest to ${outPath}...`);
  const jestJs = path.join(backendRoot, 'node_modules', 'jest', 'bin', 'jest.js');
  const args = ['--config=./jest.config.backend.js', '--runInBand', '--json', `--outputFile=${outPath}`];
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
    console.error('[baseline] Jest failed:', res.error.message);
  }
}

function extractPassing(file) {
  if (!fs.existsSync(file)) return new Set();
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const names = [];
  for (const suite of data.testResults || []) {
    for (const a of suite.assertionResults || []) {
      if (a.status === 'passed') names.push(a.fullName || a.title);
    }
  }
  return new Set(names);
}

function intersect(sets) {
  if (!sets.length) return new Set();
  let result = new Set(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    result = new Set([...result].filter(x => sets[i].has(x)));
  }
  return result;
}

function main() {
  for (const out of outputs) { runSeeders(); runJestJson(out); }
  const passingSets = outputs.map(extractPassing);
  const stable = [...intersect(passingSets)].sort();
  console.log(`[baseline] Stable intersection count: ${stable.length}`);
  const saved = stable.slice(0, Math.min(target || stable.length, stable.length));
  fs.writeFileSync(baselineFile, JSON.stringify({ recordedAt: new Date().toISOString(), count: saved.length, tests: saved }, null, 2));
  console.log(`[baseline] Wrote ${saved.length} tests to baseline at ${baselineFile}`);
}

main();

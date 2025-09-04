#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Preload backend test env so guard has local DB + MERKATO_* keys
(() => {
  const candidates = [
    path.resolve(__dirname, '..', 'backend', '.env.test.local'),
    path.resolve(__dirname, '..', 'backend', '.env.test')
  ];
  const parseLine = (line) => {
    // ignore comments and blanks
    if (!line || /^\s*#/.test(line)) return null;
    const idx = line.indexOf('=');
    if (idx === -1) return null;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    return [key, val];
  };
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const txt = fs.readFileSync(p, 'utf8');
      let loaded = 0;
      for (const raw of txt.split(/\r?\n/)) {
        const kv = parseLine(raw);
        if (!kv) continue;
        const [k, v] = kv;
        process.env[k] = v; // override intentionally for tests
        loaded++;
      }
      console.log(`[env] Loaded ${loaded} entries from ${p}`);
    } catch (e) {
      console.warn(`[env] Failed to load ${p}:`, e.message);
    }
  }
})();

// Enforce workspace boundary before running any tests
try {
  require('./guard-boundaries').guard({ phase: 'tests' });
} catch (e) {
  console.error('[Pre-test] Boundary guard failed:', e.message || e);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    const onSigint = () => {
      try { process.kill(child.pid); } catch (_) {}
    };
    process.once('SIGINT', onSigint);
    child.on('close', (code) => {
      process.removeListener('SIGINT', onSigint);
      resolve(code ?? 1);
    });
  });
}

(async () => {
  console.log('Running frontend tests...');
  let code = await run('npm', ['run', 'test:frontend']);
  if (code !== 0) process.exit(code);

  console.log('Running backend tests...');
  code = await run('npm', ['run', 'test:backend']);
  if (code !== 0) process.exit(code);

  console.log('Running e2e tests (full suite)...');
  // Ensure no accidental spec override; rely on run-e2e default to run all, but honor --spec if passed to this script
  const args = process.argv.slice(2);
  const specIdx = args.findIndex(a => a === '--spec' || a.startsWith('--spec='));
  const e2eEnv = { ...process.env };
  if (!e2eEnv.MERKATO_TEST_EMAIL_TO) {
    e2eEnv.MERKATO_TEST_EMAIL_TO = process.env.MERKATO_TEST_EMAIL_TO || 'qa@merkato.test';
  }
  delete e2eEnv.CYPRESS_spec; delete e2eEnv.CYPRESS_SPEC; delete e2eEnv.E2E_SPEC; delete e2eEnv.SPEC;
  const e2eArgs = ['run', 'test:e2e'];
  if (specIdx !== -1) {
    const val = args[specIdx].includes('=') ? args[specIdx].split('=').slice(1).join('=') : args[specIdx + 1];
    if (val) e2eArgs.push('--', '--spec', val);
  }
  code = await run('npm', e2eArgs, { env: e2eEnv });
  process.exit(code);
})();

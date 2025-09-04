#!/usr/bin/env node
const { spawn } = require('child_process');

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    p.on('close', (code) => resolve(code ?? 1));
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
  delete e2eEnv.CYPRESS_spec; delete e2eEnv.CYPRESS_SPEC; delete e2eEnv.E2E_SPEC; delete e2eEnv.SPEC;
  const e2eArgs = ['run', 'test:e2e'];
  if (specIdx !== -1) {
    const val = args[specIdx].includes('=') ? args[specIdx].split('=').slice(1).join('=') : args[specIdx + 1];
    if (val) e2eArgs.push('--', '--spec', val);
  }
  code = await run('npm', e2eArgs, { env: e2eEnv });
  process.exit(code);
})();

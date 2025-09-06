#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const backend = path.join(root, 'backend');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} failed (${code})`))));
  });
}
function exists(p) { return fs.existsSync(p); }
function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function hasTestScript(pkg) {
  const s = pkg?.scripts?.test;
  if (!s) return false;
  // Skip the default npm init placeholder
  return !/no test specified/i.test(s);
}

async function ensureDeps(dir) {
  if (!exists(path.join(dir, 'node_modules'))) {
    await run('npm', ['ci'], { cwd: dir });
  }
}

async function runFrontend() {
  if (!exists(path.join(frontend, 'package.json'))) {
    console.log('[frontend] skipped (no package.json)');
    return;
  }
  await ensureDeps(frontend);
  await run('npm', ['test', '--', '--watchAll=false'], { cwd: frontend, env: { ...process.env, CI: 'true' } });

  // Optional Cypress E2E
  const pkg = readJSON(path.join(frontend, 'package.json'));
  const hasCypress = (pkg.devDependencies && pkg.devDependencies.cypress) || exists(path.join(frontend, 'node_modules', '.bin', 'cypress'));
  if (hasCypress) {
    try {
      await run('npx', ['--yes', 'cypress', 'run'], { cwd: frontend });
    } catch (e) {
      console.warn('[frontend] Cypress failed:', e.message);
      throw e;
    }
  } else {
    console.log('[frontend] Cypress not installed; skipping E2E.');
  }
}

async function runBackend() {
  if (!exists(path.join(backend, 'package.json'))) {
    console.log('[backend] skipped (no package.json)');
    return;
  }
  await ensureDeps(backend);
  const pkg = readJSON(path.join(backend, 'package.json'));
  if (!hasTestScript(pkg)) {
    console.log('[backend] skipped (no usable "test" script)');
    return;
  }
  await run('npm', ['test', '--', '--watchAll=false'], { cwd: backend, env: { ...process.env, CI: 'true', NODE_ENV: 'test' } });
}

(async () => {
  const args = new Set(process.argv.slice(2));
  const doFrontend = args.size === 0 || args.has('--frontend') || args.has('-f');
  const doBackend = args.size === 0 || args.has('--backend') || args.has('-b');

  if (doFrontend) await runFrontend();
  if (doBackend) await runBackend();

  console.log('\nAll done.');
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
#!/usr/bin/env node
// Starts backend then frontend, opening the browser via the frontend's opener. Windows-safe.
const { spawn } = require('child_process');
const net = require('net');

const ROOT = __dirname.replace(/\\scripts$/, '');

function waitForPort(port, hosts = ['127.0.0.1', 'localhost'], timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise(async (resolve, reject) => {
    const tryOnce = (host) => new Promise((res, rej) => {
      const sock = net.createConnection({ host, port, timeout: 2000 }, () => {
        sock.end();
        res(true);
      });
      sock.on('error', () => rej(false));
      sock.on('timeout', () => {
        sock.destroy(new Error('timeout'));
        rej(false);
      });
    });
    while (Date.now() < deadline) {
      for (const h of hosts) {
        try { await tryOnce(h); return resolve(true); } catch (_) {}
      }
      await new Promise(r => setTimeout(r, 800));
    }
    reject(new Error(`Port ${hosts.join(',')}:${port} not ready within ${timeoutMs}ms`));
  });
}

function run(cmd, args, options = {}) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: true, ...options });
  return child;
}

(async () => {
  // 1) Start backend
  console.log('[auto] Starting backend on :5000...');
  const backend = run('node', ['server.js'], { cwd: `${ROOT}\\backend` });

  // Ensure Ctrl+C forwards to backend/frontend
  const onSigInt = () => {
    try { process.kill(backend.pid); } catch (_) {}
    try { if (frontend && frontend.pid) process.kill(frontend.pid); } catch (_) {}
    process.exit(0);
  };
  process.once('SIGINT', onSigInt);

  try {
    await waitForPort(5000);
    console.log('[auto] Backend is reachable. Starting frontend...');
  } catch (e) {
    console.warn('[auto] Backend did not become reachable in time, continuing anyway. Reason:', e.message);
  }

  // 2) Start frontend (it will open the browser itself when ready)
  let frontend = run('npm', ['start'], { cwd: `${ROOT}\\frontend` });

  // If frontend exits, keep backend running until Ctrl+C
  frontend.on('close', (code) => {
    console.log(`[auto] Frontend exited with code ${code}. Press Ctrl+C to stop backend.`);
  });
})();

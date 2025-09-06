const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const waitOn = require('wait-on');

// Ensure backend API URL for build-time
process.env.REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5051';

const frontendDir = process.cwd();
const backendDir = path.resolve(frontendDir, '..', 'backend');

function run(cmd, args, options = {}) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: true, ...options });
  child.on('error', (e) => console.error(`[proc error] ${cmd} ${args.join(' ')} ->`, e));
  return child;
}

function checkPort(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

async function findPort(start = 5051, limit = 20) {
  for (let p = start; p < start + limit; p++) {
    // if we can bind then it's free; return this port
    if (await checkPort(p)) return p;
  }
  throw new Error('No free port found for backend');
}

async function main() {
  const backendPort = await findPort(5051);
  console.log(`[e2e] Starting backend on :${backendPort}...`);
  const backendEnv = { ...process.env, NODE_ENV: 'development', PORT: String(backendPort) };
  const backend = run('node', ['server.js'], { cwd: backendDir, env: backendEnv });

  const cleanup = () => {
    console.log('\n[e2e] Shutting down...');
    try { backend.kill(); } catch {}
    try { if (frontend) frontend.kill(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  console.log(`[e2e] Waiting for backend http://localhost:${backendPort}/api ...`);
  await waitOn({ resources: [`http://localhost:${backendPort}/api`], timeout: 120000 });

  process.env.REACT_APP_API_URL = `http://localhost:${backendPort}`;
  console.log('[e2e] Building frontend with REACT_APP_API_URL=%s ...', process.env.REACT_APP_API_URL);
  const build = run('npm', ['run', 'build'], { cwd: frontendDir });
  await new Promise((resolve, reject) => {
    build.on('close', (code) => code === 0 ? resolve() : reject(new Error(`build exited ${code}`)));
  });

  console.log('[e2e] Serving frontend on :3000 ...');
  var frontend = run('npx', ['serve', '-s', 'build', '-l', '3000'], { cwd: frontendDir });

  console.log('[e2e] Waiting for frontend http://localhost:3000 ...');
  await waitOn({ resources: ['http://localhost:3000'], timeout: 120000 });

  console.log('[e2e] Both servers are up. Keeping process alive for Cypress...');
}

main().catch((err) => {
  console.error('[e2e] Failed:', err);
  process.exit(1);
});

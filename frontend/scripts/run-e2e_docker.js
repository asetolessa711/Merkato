const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');
const os = require('os');
const { spawn, execSync } = require('child_process');
const waitOn = require('wait-on');
const net = require('net');

function run(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  child.on('error', (e) => console.error(`[proc error] ${cmd} ${args.join(' ')} ->`, e.message || e));
  return child;
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const frontendDir = path.resolve(__dirname, '..');
  const backendDir = path.resolve(repoRoot, 'backend');

  // Per-project caches
  const projectCacheDir = path.join(repoRoot, '.cache');
  const npmCache = path.join(projectCacheDir, 'npm');
  try { fs.mkdirSync(npmCache, { recursive: true }); } catch {}

  // Pick a free backend port (prefer 5051)
  const backendPort = await findFreePort(5051);
  const apiUrl = `http://localhost:${backendPort}`;

  console.log(`[e2e-docker] Starting backend on ${backendPort} ...`);
  const backendEnv = { ...process.env, NODE_ENV: 'development', PORT: String(backendPort), npm_config_cache: npmCache };
  let backend = run('node', ['server.js'], { cwd: backendDir, env: backendEnv });

  let frontend = null;
  const cleanup = () => {
    console.log('\n[e2e-docker] Cleaning up processes...');
    try { if (frontend && !frontend.killed) killProcessTree(frontend.pid); } catch {}
    try { if (backend && !backend.killed) killProcessTree(backend.pid); } catch {}
  };
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });
  process.on('exit', () => { cleanup(); });
  process.on('uncaughtException', (err) => { console.error('[e2e-docker] Uncaught exception:', err); cleanup(); process.exit(1); });
  process.on('unhandledRejection', (err) => { console.error('[e2e-docker] Unhandled rejection:', err); cleanup(); process.exit(1); });

  console.log(`[e2e-docker] Waiting for backend ${apiUrl}/api ...`);
  await waitOn({ resources: [`${apiUrl}/api`], timeout: 60000 });

  // Seed DB
  try {
    console.log(`[e2e-docker] Seeding DB via ${apiUrl}/api/dev/seed ...`);
    const seedRes = await fetch(`${apiUrl}/api/dev/seed`, { method: 'POST' });
    console.log('[e2e-docker] Seed status:', seedRes.status);
  } catch (e) {
    console.warn('[e2e-docker] Seed request failed:', e.message);
  }

  console.log(`[e2e-docker] Building frontend with REACT_APP_API_URL=${apiUrl} ...`);
  const preferredBuildDir = path.join(frontendDir, `build-e2e-${backendPort}-${Date.now()}`);
  const buildEnv = { ...process.env, REACT_APP_API_URL: apiUrl, BUILD_PATH: preferredBuildDir, npm_config_cache: npmCache };
  const build = run('npm', ['run', 'build'], { cwd: frontendDir, env: buildEnv });
  const buildCode = await new Promise((resolve) => build.on('close', resolve));
  if (buildCode !== 0) { cleanup(); process.exit(buildCode); }

  const defaultBuildDir = path.join(frontendDir, 'build');
  const actualBuildDir = fs.existsSync(preferredBuildDir) && fs.existsSync(path.join(preferredBuildDir, 'index.html')) ? preferredBuildDir : defaultBuildDir;

  const tempServeDir = path.join(os.tmpdir(), `merkato-e2e-${Date.now()}`);
  await copyDir(actualBuildDir, tempServeDir);

  const frontendPort = await findFreePort(3000);
  console.log(`[e2e-docker] Serving frontend from temp dir on http://localhost:${frontendPort} ...`);
  const frontendServer = await startStaticServer(tempServeDir, frontendPort);
  frontend = { pid: null, killed: false, kill: () => { try { frontendServer.close(); } catch (_) {} } };

  console.log(`[e2e-docker] Waiting for frontend http://localhost:${frontendPort} ...`);
  await waitOn({ resources: [`http://localhost:${frontendPort}`], timeout: 60000 });

  // Verify Docker is available
  try { execSync('docker --version', { stdio: 'inherit' }); } catch (e) {
    console.error('\n[e2e-docker] Docker is not available on PATH. Please install Docker Desktop.');
    cleanup();
    process.exit(1);
  }

  console.log('[e2e-docker] Running Cypress in Docker...');
  const image = process.env.CYPRESS_DOCKER_IMAGE || 'cypress/included:14.5.0';
  const specArg = process.env.E2E_SPEC ? ['--spec', process.env.E2E_SPEC] : [];

  const dockerArgs = [
    'run', '--rm', '-t',
    '-v', `${frontendDir.replace(/\\/g, '/') }:/e2e`,
    '-w', '/e2e',
    '-e', `CYPRESS_baseUrl=http://host.docker.internal:${frontendPort}`,
    image,
    ...specArg
  ];

  const cy = run('docker', dockerArgs, { cwd: frontendDir });
  const cyCode = await new Promise((resolve) => cy.on('close', resolve));
  cleanup();
  process.exit(cyCode);
}

main().catch((err) => { console.error('[e2e-docker] Fatal error:', err); process.exit(1); });

function findFreePort(startPort) {
  return new Promise((resolve) => {
    const tryPort = (port) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => { tryPort(port + 1); });
      server.listen(port, () => { const chosen = server.address().port; server.close(() => resolve(chosen)); });
    };
    tryPort(startPort);
  });
}

async function copyDir(src, dest) {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      const link = await fs.promises.readlink(srcPath);
      await fs.promises.symlink(link, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F > NUL 2>&1`);
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch (_) {}
}

function startStaticServer(rootDir, port) {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        const parsed = url.parse(req.url);
        let pathname = decodeURIComponent(parsed.pathname || '/');
        if (pathname.includes('..')) pathname = '/';
        let filePath = path.join(rootDir, pathname);
        const exists = await safeStat(filePath);
        if (!exists || exists.isDirectory()) {
          filePath = path.join(rootDir, 'index.html');
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeType(ext);
        fs.createReadStream(filePath)
          .on('error', () => send500(res))
          .once('open', () => { res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' }); })
          .pipe(res);
      } catch (_) { send500(res); }
    });
    server.listen(port, () => resolve(server));
  });
}

function send500(res) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Internal Server Error'); }
function safeStat(p) { return fs.promises.stat(p).catch(() => null); }
function mimeType(ext) {
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    case '.map': return 'application/json; charset=utf-8';
    case '.txt': return 'text/plain; charset=utf-8';
    default: return 'application/octet-stream';
  }
}


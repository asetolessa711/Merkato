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
  // Use project-local caches to avoid cross-project contamination
  const projectCacheDir = path.join(repoRoot, '.cache');
  const cypressCache = path.join(projectCacheDir, 'cypress');
  const npmCache = path.join(projectCacheDir, 'npm');
  const puppeteerCache = path.join(projectCacheDir, 'puppeteer');
  try { fs.mkdirSync(cypressCache, { recursive: true }); } catch {}
  try { fs.mkdirSync(npmCache, { recursive: true }); } catch {}
  try { fs.mkdirSync(puppeteerCache, { recursive: true }); } catch {}

  // Pick a free backend port (prefer 5051)
  const backendPort = await findFreePort(5051);
  const apiUrl = `http://localhost:${backendPort}`;

  console.log(`[e2e] Starting backend on ${backendPort} ...`);
  const backendEnv = { ...process.env, NODE_ENV: 'development', PORT: String(backendPort),
    npm_config_cache: npmCache, PUPPETEER_CACHE_DIR: puppeteerCache };
  let backend = run('node', ['server.js'], { cwd: backendDir, env: backendEnv });

  let frontend = null;
  const cleanup = () => {
    console.log('\n[e2e] Cleaning up processes...');
    // Kill "serve" process
    try { if (frontend && !frontend.killed) killProcessTree(frontend.pid); } catch {}
    // Kill backend process
    try { if (backend && !backend.killed) killProcessTree(backend.pid); } catch {}
  };
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });
  process.on('exit', () => { cleanup(); });
  process.on('uncaughtException', (err) => { console.error('[e2e] Uncaught exception:', err); cleanup(); process.exit(1); });
  process.on('unhandledRejection', (err) => { console.error('[e2e] Unhandled rejection:', err); cleanup(); process.exit(1); });

  console.log(`[e2e] Waiting for backend ${apiUrl}/api ...`);
  await waitOn({ resources: [`${apiUrl}/api`], timeout: 60000 });

  // Proactively seed DB before building so products/users exist immediately
  try {
    console.log(`[e2e] Seeding DB via ${apiUrl}/api/dev/seed ...`);
    const seedRes = await fetch(`${apiUrl}/api/dev/seed`, { method: 'POST' });
    console.log('[e2e] Seed status:', seedRes.status);
  } catch (e) {
    console.warn('[e2e] Seed request failed:', e.message);
  }

  console.log(`[e2e] Building frontend with REACT_APP_API_URL=${apiUrl} ...`);
  const preferredBuildDir = path.join(frontendDir, `build-e2e-${backendPort}-${Date.now()}`);
  const buildEnv = { ...process.env, REACT_APP_API_URL: apiUrl, BUILD_PATH: preferredBuildDir,
    npm_config_cache: npmCache };
  const build = run('npm', ['run', 'build'], { cwd: frontendDir, env: buildEnv });
  const buildCode = await new Promise((resolve) => build.on('close', resolve));
  if (buildCode !== 0) {
    cleanup();
    process.exit(buildCode);
  }

  // Determine actual build output folder (CRA may ignore BUILD_PATH under some wrappers)
  const defaultBuildDir = path.join(frontendDir, 'build');
  const actualBuildDir = fs.existsSync(preferredBuildDir) && fs.existsSync(path.join(preferredBuildDir, 'index.html'))
    ? preferredBuildDir
    : defaultBuildDir;

  // Copy build to a temp dir outside OneDrive to avoid EPERM lstat issues
  const tempServeDir = path.join(os.tmpdir(), `merkato-e2e-${Date.now()}`);
  await copyDir(actualBuildDir, tempServeDir);

  // Pick a free frontend port to avoid conflicts with any stale processes
  const frontendPort = await findFreePort(3000);
  console.log(`[e2e] Serving frontend from temp dir on http://localhost:${frontendPort} ...`);
  // Serve from temp dir with a tiny static server to avoid npx prompts
  const frontendServer = await startStaticServer(tempServeDir, frontendPort);
  frontend = { pid: null, killed: false, kill: () => { try { frontendServer.close(); } catch (_) {} } };

  console.log(`[e2e] Waiting for frontend http://localhost:${frontendPort} ...`);
  await waitOn({ resources: [`http://localhost:${frontendPort}`], timeout: 60000 });

  console.log('[e2e] Running Cypress...');
  // Attempt to pin Cypress binary explicitly on Windows to avoid PATH conflicts
  let runBinary;
  try {
    if (process.platform === 'win32') {
      const cacheRoot = path.join(process.env.LOCALAPPDATA || '', 'Cypress', 'Cache');
      if (fs.existsSync(cacheRoot)) {
        const versions = fs.readdirSync(cacheRoot, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        const latest = versions[versions.length - 1];
        if (latest) {
          const candidate = path.join(cacheRoot, latest, 'Cypress', 'Cypress.exe');
          if (fs.existsSync(candidate)) runBinary = candidate;
        }
      }
    }
  } catch (_) {}\n  // Prefer project-local Cypress cache binary if available
  if (!runBinary && process.platform === 'win32') {
    try {
      if (fs.existsSync(cypressCache)) {
        const versions = fs.readdirSync(cypressCache, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        const latest = versions[versions.length - 1];
        if (latest) {
          const candidate = path.join(cypressCache, latest, 'Cypress', 'Cypress.exe');
          if (fs.existsSync(candidate)) runBinary = candidate;
        }
      }
    } catch (_) {}
  }\n  const cyEnv = { ...process.env, CYPRESS_API_URL: apiUrl, CYPRESS_video: 'false',
    CYPRESS_CACHE_FOLDER: cypressCache,
    npm_config_cache: npmCache,
    ...(runBinary ? { CYPRESS_RUN_BINARY: runBinary } : {}) };
  const specArg = process.env.E2E_SPEC ? ['--spec', process.env.E2E_SPEC] : [];
  const reportPath = path.join(frontendDir, 'cypress-report.json');
  const cyArgs = [
    'cypress', 'run',
    '--config', `baseUrl=http://localhost:${frontendPort}`,
    '--browser', 'electron',
    '--reporter', 'json',
    '--reporter-options', `output=${reportPath}`,
    ...specArg
  ];
  const cy = run('npx', cyArgs, { cwd: frontendDir, env: cyEnv });
  const cyCode = await new Promise((resolve) => cy.on('close', resolve));
  try {
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      const stats = report?.stats || {};
      console.log(`[e2e] Cypress results: ${stats.tests || 0} tests, ${stats.passes || 0} passed, ${stats.failures || 0} failed`);
    }
  } catch (_) {}
  cleanup();
  process.exit(cyCode);
}

main().catch((err) => {
  console.error('[e2e] Fatal error:', err);
  process.exit(1);
});

function findFreePort(startPort) {
  return new Promise((resolve) => {
    const tryPort = (port) => {
      const server = net.createServer();
      server.unref();
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
          // try next port
          tryPort(port + 1);
        } else {
          // unexpected error; still try next
          tryPort(port + 1);
        }
      });
      server.listen(port, () => {
        const chosen = server.address().port;
        server.close(() => resolve(chosen));
      });
    };
    tryPort(startPort);
  });
}

// Recursively copy a directory (without relying on fs.cp for Node compatibility)
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
        // Prevent path traversal
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
          .once('open', () => {
            res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
          })
          .pipe(res);
      } catch (_) {
        send500(res);
      }
    });
    server.listen(port, () => resolve(server));
  });
}

function send500(res) {
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end('Internal Server Error');
}

function safeStat(p) {
  return fs.promises.stat(p).catch(() => null);
}

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


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

  // Pick a free backend port (prefer 5051)
  const backendPort = await findFreePort(5051);
  const apiUrl = `http://localhost:${backendPort}`;

  console.log(`[e2e] Starting backend on ${backendPort} ...`);
  const backendEnv = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(backendPort),
    // Provide a safe default local MongoDB URI if not set in the environment (useful for CI/local dev)
    MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/merkato?directConnection=true'
  };
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
  const buildEnv = { ...process.env, REACT_APP_API_URL: apiUrl, BUILD_PATH: preferredBuildDir };
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
  const cyEnv = { ...process.env, CYPRESS_API_URL: apiUrl, CYPRESS_video: 'false' };
  // Clear stray spec overrides that can force single-spec runs
  delete cyEnv.CYPRESS_spec; // common accidental override
  delete cyEnv.CYPRESS_SPEC;
  delete cyEnv.E2E_SPEC;
  delete cyEnv.SPEC;
  // Prefer an explicit --spec CLI flag; ignore stray env like E2E_SPEC to avoid accidental single-spec runs
  const argvSpec = parseArg('--spec');
  const specArg = argvSpec ? ['--spec', argvSpec] : [];
  if (argvSpec) {
    console.log(`[e2e] Spec override via --spec: ${argvSpec}`);
  } else {
    console.log('[e2e] No spec override provided; running full Cypress suite (sanitized env).');
  }
  const cyArgs = ['cypress', 'run', '--config', `baseUrl=http://localhost:${frontendPort}`, ...specArg];
  const cy = run('npx', cyArgs, { cwd: frontendDir, env: cyEnv });
  const cyCode = await new Promise((resolve) => cy.on('close', resolve));

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

// Simple argv parser for flags like --spec "file1,file2"
function parseArg(name) {
  const idx = process.argv.findIndex((a) => a === name || a.startsWith(name + '='));
  if (idx === -1) return '';
  const token = process.argv[idx];
  if (token.includes('=')) return token.split('=').slice(1).join('=');
  const next = process.argv[idx + 1];
  if (!next || next.startsWith('--')) return '';
  return next;
}

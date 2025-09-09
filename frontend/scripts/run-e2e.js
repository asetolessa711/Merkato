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

  // Execution modes
  // - E2E_ATTACH=true: attach to already-running services.
  //   Requires E2E_BASE_URL (frontend) and E2E_API_URL (backend).
  // - E2E_EPHEMERAL=true: when starting the backend in this script, use a unique DB name per run
  //   via MONGO_URI = .../<prefix>-<pid>-<timestamp>-<rand> to avoid cross-run state.
  const attachMode = String(process.env.E2E_ATTACH || '').toLowerCase() === 'true';
  const semiAttach = String(process.env.E2E_SEMI_ATTACH || '').toLowerCase() === 'true'; // start backend here, reuse external frontend
  const ephemeralDb = String(process.env.E2E_EPHEMERAL || '').toLowerCase() === 'true';
  const autoDrop = String(process.env.E2E_AUTODROP || '').toLowerCase() === 'true';
  const dbPrefix = process.env.E2E_DB_PREFIX || 'merkato_e2e';

  // Per-project caches to avoid cross-project contamination
  const projectCacheDir = path.join(repoRoot, '.cache');
  const cypressCache = path.join(projectCacheDir, 'cypress');
  const npmCache = path.join(projectCacheDir, 'npm');
  const puppeteerCache = path.join(projectCacheDir, 'puppeteer');
  try { fs.mkdirSync(cypressCache, { recursive: true }); } catch {}
  try { fs.mkdirSync(npmCache, { recursive: true }); } catch {}
  try { fs.mkdirSync(puppeteerCache, { recursive: true }); } catch {}

  // In attach mode, we do not start backend or build/serve frontend
  let backend = null;
  let frontend = null;
  let backendPort, apiUrl, ephemeralDbName = null;
  let mongoBase = null;
  if (attachMode) {
    apiUrl = (process.env.E2E_API_URL || process.env.CYPRESS_API_URL || 'http://localhost:5051').replace(/\/$/, '');
    console.log(`[e2e] ATTACH mode: using API at ${apiUrl}`);
  } else {
    // Ensure MongoDB is accepting connections in CI before starting backend to avoid early exit
    try {
      await waitOn({ resources: ['tcp:127.0.0.1:27017'], timeout: 60000 });
    } catch (_) {
      console.warn('[e2e] MongoDB port 27017 not ready after 60s; continuing and letting backend retry connect...');
    }
    // For SEMI-ATTACH, prefer port 5000 to match CRA dev proxy default
    if (semiAttach) {
      backendPort = Number(process.env.E2E_BACKEND_PORT || 5000);
    } else {
  // Pick a free backend port (prefer 5051) or honor E2E_BACKEND_PORT
  const preferred = Number(process.env.E2E_BACKEND_PORT || 5051);
  backendPort = await findFreePort(preferred);
    }
    apiUrl = `http://localhost:${backendPort}`;

    // Compute Mongo URI. If E2E_EPHEMERAL, generate a unique DB name for this run.
    mongoBase = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    ephemeralDbName = ephemeralDb ? `${dbPrefix}-${suffix}` : `${dbPrefix}`;
    const { base: mongoBaseNoDb, query: mongoQuery } = parseMongoBase(mongoBase);
    const mongoUri = `${mongoBaseNoDb}/${ephemeralDbName}${mongoQuery}`;

    console.log(`[e2e] Starting backend on ${backendPort} ...`);
    const backendEnv = {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(backendPort),
      // Force local Mongo for speed and determinism
      MONGO_URI: mongoUri,
      // Provide safe dummy email creds so sendEmail.js doesn't throw on require in routes
      EMAIL_USER: process.env.EMAIL_USER || 'test@example.com',
      EMAIL_PASS: process.env.EMAIL_PASS || 'test-password',
      npm_config_cache: npmCache,
      PUPPETEER_CACHE_DIR: puppeteerCache,
    };
    backend = run('node', ['server.js'], { cwd: backendDir, env: backendEnv });
  }
  const cleanup = () => {
    console.log('\n[e2e] Cleaning up processes...');
    try { if (frontend && !frontend.killed) killProcessTree(frontend.pid); } catch {}
    try { if (backend && !backend.killed) killProcessTree(backend.pid); } catch {}
  };
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });
  process.on('exit', () => { cleanup(); });
  process.on('uncaughtException', (err) => { console.error('[e2e] Uncaught exception:', err); cleanup(); process.exit(1); });
  process.on('unhandledRejection', (err) => { console.error('[e2e] Unhandled rejection:', err); cleanup(); process.exit(1); });

  console.log(`[e2e] Waiting for backend ${apiUrl}/api ...`);
  await waitOn({ resources: [`${apiUrl}/api`], timeout: attachMode || semiAttach ? 20000 : 60000 });

  // Seed DB
  try {
    console.log(`[e2e] Seeding DB via ${apiUrl}/api/dev/seed ...`);
    const seedRes = await fetch(`${apiUrl}/api/dev/seed`, { method: 'POST' });
    console.log('[e2e] Seed status:', seedRes.status);
  } catch (e) {
    console.warn('[e2e] Seed request failed:', e.message);
  }

  let baseUrl;
  if (attachMode || semiAttach) {
    baseUrl = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    console.log(`[e2e] ${attachMode ? 'ATTACH' : 'SEMI-ATTACH'} mode: using frontend at ${baseUrl}`);
    // Ensure attach targets are up
    await waitOn({ resources: [baseUrl], timeout: 60000 });
  } else {
    console.log(`[e2e] Preparing frontend (reuse recent build when possible) ...`);
    const defaultBuildDir = path.join(frontendDir, 'build');
    const buildReuseEnabled = String(process.env.E2E_REUSE_BUILD || 'true').toLowerCase() === 'true';
    const reuseWindowMin = Number(process.env.E2E_REUSE_BUILD_MINUTES || 60);
    const now = Date.now();
    const isFresh = (dir) => {
      try {
        const stat = fs.statSync(dir);
        return (now - (stat.mtimeMs || 0)) < reuseWindowMin * 60 * 1000;
      } catch (_) { return false; }
    };
    const candidates = [];
    // Consider default build
    if (fs.existsSync(path.join(defaultBuildDir, 'index.html'))) {
      candidates.push(defaultBuildDir);
    }
    // Consider prior build-e2e-* directories
    try {
      const entries = fs.readdirSync(frontendDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && /^build-e2e-/.test(e.name)) {
          const p = path.join(frontendDir, e.name);
          if (fs.existsSync(path.join(p, 'index.html'))) candidates.push(p);
        }
      }
    } catch (_) {}
    // Pick the newest usable candidate
    let chosenReusable = null;
    if (buildReuseEnabled && candidates.length) {
      candidates.sort((a,b) => ((fs.statSync(b).mtimeMs||0) - (fs.statSync(a).mtimeMs||0)));
      for (const c of candidates) {
        if (isFresh(c)) { chosenReusable = c; break; }
      }
    }
    if (chosenReusable) {
      console.log(`[e2e] Reusing recent build: ${path.basename(chosenReusable)} (<= ${reuseWindowMin} min old)`);
      await prepareAndServe(chosenReusable);
    } else {
      console.log(`[e2e] No recent build to reuse. Building with REACT_APP_API_URL=${apiUrl} ...`);
      const preferredBuildDir = path.join(frontendDir, `build-e2e-${backendPort}-${Date.now()}`);
      const buildEnv = { 
        ...process.env,
        REACT_APP_API_URL: apiUrl,
        BUILD_PATH: preferredBuildDir,
        // Disable CRA ESLint plugin during automated E2E builds to prevent plugin/rule noise
        DISABLE_ESLINT_PLUGIN: 'true',
        // Optional: speed-ups and smaller output
        GENERATE_SOURCEMAP: 'false',
        npm_config_cache: npmCache,
      };
      const build = run('npm', ['run', 'build'], { cwd: frontendDir, env: buildEnv });
      const buildCode = await new Promise((resolve) => build.on('close', resolve));
      if (buildCode !== 0) { cleanup(); process.exit(buildCode); }
      // If CRA ignored BUILD_PATH, fall back to default
      const actual = fs.existsSync(preferredBuildDir) && fs.existsSync(path.join(preferredBuildDir, 'index.html')) ? preferredBuildDir : defaultBuildDir;
      await prepareAndServe(actual);
    }
    async function prepareAndServe(actualBuildDir) {
      const tempServeDir = path.join(os.tmpdir(), `merkato-e2e-${Date.now()}`);
      await copyDir(actualBuildDir, tempServeDir);
      const frontendPort = await findFreePort(3000);
      baseUrl = `http://localhost:${frontendPort}`;
      console.log(`[e2e] Serving frontend from temp dir on ${baseUrl} ...`);
      const frontendServer = await startStaticServer(tempServeDir, frontendPort);
      frontend = { pid: null, killed: false, kill: () => { try { frontendServer.close(); } catch (_) {} } };
      console.log(`[e2e] Waiting for frontend ${baseUrl} ...`);
      await waitOn({ resources: [baseUrl], timeout: 60000 });
    }
  }

  // Allow selecting browser via E2E_BROWSER, default to electron for portability
  const e2eBrowser = String(process.env.E2E_BROWSER || 'electron');
  console.log(`[e2e] Running Cypress (${e2eBrowser} headless, video off)...`);
  // In CI or task-driven full runs, force running all specs unless explicitly disabled with E2E_USE_ALL=false
  const isCI = String(process.env.CI || '').toLowerCase() === 'true';
  const forceAll = isCI && String(process.env.E2E_USE_ALL || 'true').toLowerCase() !== 'false';
  const cyEnv = { ...process.env, CYPRESS_API_URL: apiUrl, CYPRESS_video: 'false', CYPRESS_CACHE_FOLDER: cypressCache, npm_config_cache: npmCache };
  if (forceAll) {
    // Clear any E2E_SPEC inherited from the parent environment for this child process
    delete cyEnv.E2E_SPEC;
  }
  // If a stray CYPRESS_spec is present in the environment, it can override --spec and
  // point to an invalid path (e.g., repo root). Clear it unless E2E_SPEC is explicitly provided.
  if (forceAll || !process.env.E2E_SPEC) {
    // Remove any CYPRESS_* vars that can force spec selection (spec, specs, specPattern, testFiles, integrationFolder)
    const scrubKeys = new Set([
      'cypress_spec',
      'cypress_specs',
      'cypress_specpattern',
      'cypress_testfiles',
      'cypress_integrationfolder',
      'cypress_e2e__specpattern',
      'cypress_e2e__spec',
      'cypress_e2e__specs',
      'npm_config_spec',
      'npm_config_specs',
      // common underscore variants
      'cypress_spec_pattern',
      'cypress_test_files',
      'cypress_integration_folder',
    ]);
    Object.keys(cyEnv).forEach((key) => {
      const k = String(key).toLowerCase();
      const kflat = k.replace(/[_-]/g, '');
      if (
        scrubKeys.has(k) ||
        scrubKeys.has(kflat) ||
        (k.startsWith('cypress_') && (
          k.includes('specpattern') ||
          k.includes('spec_pattern') ||
          k.endsWith('__spec') ||
          k.endsWith('__specs') ||
          k.includes('testfiles') ||
          k.includes('test_files') ||
          k.includes('integrationfolder') ||
          k.includes('integration_folder')
        ))
      ) {
        try { delete cyEnv[key]; } catch (_) { cyEnv[key] = ''; }
      }
    });
    // Special-case: CYPRESS_e2e may contain JSON that overrides specPattern/spec via env.
    // If present and contains those fields, drop it entirely to avoid partial spec runs.
    for (const candidate of ['CYPRESS_e2e', 'CYPRESS_E2E', 'cypress_e2e']) {
      if (cyEnv[candidate]) {
        try {
          const parsed = JSON.parse(String(cyEnv[candidate]));
          if (parsed && (parsed.specPattern || parsed.spec || parsed.specs || parsed.testFiles || parsed.integrationFolder)) {
            delete cyEnv[candidate];
          }
        } catch (_) {
          // If it's not JSON, but looks like it might constrain specs, drop it proactively
          const v = String(cyEnv[candidate]).toLowerCase();
          if (v.includes('spec') || v.includes('testfiles') || v.includes('integration')) {
            delete cyEnv[candidate];
          }
        }
      }
    }
  }
  let specArg = [];
  if (!forceAll && process.env.E2E_SPEC) {
    const raw = String(process.env.E2E_SPEC);
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    const resolved = [];
    const specRoot = path.join(frontendDir, 'cypress', 'e2e');
    const allSpecs = await listSpecFiles(specRoot);
    const byBase = allSpecs.reduce((acc, p) => { acc[path.basename(p)] = p; return acc; }, {});
    for (const p of parts) {
      // Absolute or relative path that exists
      const abs = path.isAbsolute(p) ? p : path.join(frontendDir, p);
      if (fs.existsSync(abs)) { resolved.push(path.relative(frontendDir, abs)); continue; }
      // If looks like a plain filename, try to map to cypress/e2e
      const base = path.basename(p);
      if (byBase[base]) { resolved.push(path.relative(frontendDir, byBase[base])); continue; }
      // If starts with 'cypress/e2e', ensure it exists
      const underE2E = path.join(specRoot, p.replace(/^cypress[\\/]+e2e[\\/]+/i, ''));
      if (fs.existsSync(underE2E)) { resolved.push(path.relative(frontendDir, underE2E)); continue; }
      console.warn(`[e2e] Ignoring unknown spec entry: ${p}`);
    }
    if (resolved.length > 0) {
      specArg = ['--spec', resolved.join(',')];
    } else {
      console.log('[e2e] E2E_SPEC provided but no matching files were found. Running default spec discovery.');
    }
  } else {
    // No explicit spec filter provided; enumerate all specs and pass them explicitly to avoid env/config overrides.
    try {
      const specRoot = path.join(frontendDir, 'cypress', 'e2e');
      const allSpecs = await listSpecFiles(specRoot);
      if (allSpecs && allSpecs.length) {
        const rel = allSpecs.map((p) => path.relative(frontendDir, p));
        specArg = ['--spec', rel.join(',')];
        console.log(`[e2e] Running all specs explicitly: ${rel.length} files`);
      }
    } catch (e) {
      console.warn('[e2e] Failed to enumerate specs:', e && e.message ? e.message : e);
    }
  }
  const reportPath = path.join(frontendDir, 'cypress-report.json');
  // Always enforce a wide specPattern to avoid accidental narrowing by env or defaults
  const fullSpecPattern = 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}';
  // Use top-level specPattern for CLI compatibility (Cypress v10+); e2e.specPattern is not a valid CLI key
  const configArg = `baseUrl=${baseUrl},specPattern=${fullSpecPattern}`;
  const cyArgs = ['cypress', 'run', '--browser', e2eBrowser, '--headless', '--config', configArg, '--reporter', 'json', '--reporter-options', `output=${reportPath}`, ...specArg];
  try {
    const expose = Object.keys(cyEnv).filter(k => /^CYPRESS_/i.test(k)).reduce((acc,k)=> (acc[k]=cyEnv[k], acc), {});
    console.log('[e2e] Cypress env (filtered):', JSON.stringify(expose));
    console.log('[e2e] Cypress args:', JSON.stringify(cyArgs));
  } catch (_) {}
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
  if (ephemeralDb && !attachMode) {
    console.log(`[e2e] Ephemeral DB used for this run: ${ephemeralDbName}`);
    if (autoDrop) {
      try {
        const backendMongoPath = require('path').join(process.cwd(), '..', 'backend', 'node_modules', 'mongodb');
        // Prefer backend's installed mongodb driver to avoid adding a new dependency to frontend
        const mongodb = require(backendMongoPath);
        const { MongoClient } = mongodb;
        const { base: mongoBaseNoDb, query: mongoQuery } = parseMongoBase(mongoBase || 'mongodb://127.0.0.1:27017');
        const uri = `${mongoBaseNoDb}/${ephemeralDbName}${mongoQuery}`;
        console.log(`[e2e] Auto-dropping ephemeral DB: ${uri}`);
        // Drop DB synchronously-ish
        const drop = async () => {
          const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
          await client.connect();
          await client.db().dropDatabase();
          await client.close();
          console.log('[e2e] Ephemeral DB dropped successfully.');
        };
        // Fire and wait before exit
        await drop();
      } catch (err) {
        console.warn('[e2e] Auto-drop failed or mongodb driver not found. You can drop manually with:');
        console.warn(`      mongo --eval "db.getMongo().getDB('${ephemeralDbName}').dropDatabase()"`);
        console.warn('      Reason:', err && err.message ? err.message : err);
      }
    } else {
      console.log('[e2e] Auto-drop disabled. Set E2E_AUTODROP=true to drop at the end of the run.');
    }
  }
  process.exit(cyCode);
}

// Helper: normalize Mongo URI base (strip trailing DB if present; keep query string)
function parseMongoBase(uri) {
  try {
    const qIndex = uri.indexOf('?');
    const left = qIndex >= 0 ? uri.slice(0, qIndex) : uri;
    const query = qIndex >= 0 ? uri.slice(qIndex) : '';
    // Match mongodb://host[:port][,hosts]/[db]
    const m = left.match(/^(mongodb(?:\+srv)?:\/\/[^/]+)(?:\/[^/]+)?$/i);
    if (m) {
      return { base: m[1], query };
    }
    // Fallback: trim trailing slashes and last segment
    const trimmed = left.replace(/\/$/, '');
    const slash = trimmed.lastIndexOf('/');
    if (slash > 'mongodb://'.length) {
      return { base: trimmed.slice(0, slash), query };
    }
    return { base: trimmed, query };
  } catch (_) {
    return { base: 'mongodb://127.0.0.1:27017', query: '' };
  }
}

main().catch((err) => { console.error('[e2e] Fatal error:', err); process.exit(1); });

function findFreePort(startPort) {
  return new Promise((resolve) => {
    const tryPort = (port) => {
      const server = net.createServer();
      server.unref();
      server.on('error', (err) => { tryPort(port + 1); });
      server.listen(port, () => { const chosen = server.address().port; server.close(() => resolve(chosen)); });
    };
    tryPort(startPort);
  });
}

async function listSpecFiles(dir) {
  const out = [];
  async function walk(d) {
    let entries = [];
    try { entries = await fs.promises.readdir(d, { withFileTypes: true }); } catch (_) { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { await walk(p); }
      else if (/\.cy\.(js|jsx|ts|tsx)$/i.test(e.name)) { out.push(p); }
    }
  }
  await walk(dir);
  return out;
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

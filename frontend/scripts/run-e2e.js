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

function runWithLog(cmd, args, opts = {}, logFileBase) {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, ...opts });
  const outPath = path.join(opts.cwd || process.cwd(), '..', 'frontend', `${logFileBase || 'e2e-backend'}.log`);
  const errPath = path.join(opts.cwd || process.cwd(), '..', 'frontend', `${logFileBase || 'e2e-backend'}.err.log`);
  const outStream = fs.createWriteStream(outPath, { flags: 'a' });
  const errStream = fs.createWriteStream(errPath, { flags: 'a' });
  child.stdout.on('data', (d) => { try { process.stdout.write(d); outStream.write(d); } catch (_) {} });
  child.stderr.on('data', (d) => { try { process.stderr.write(d); errStream.write(d); } catch (_) {} });
  const closeStreams = () => { try { outStream.end(); } catch (_) {}; try { errStream.end(); } catch (_) {} };
  child.on('close', closeStreams);
  child.on('error', closeStreams);
  return child;
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const frontendDir = path.resolve(__dirname, '..');
  const backendDir = path.resolve(repoRoot, 'backend');
  // Determine PR smoke via env or CLI arg fallback (robust truthy parsing)
  const rawPrSmoke = String(process.env.PR_SMOKE || '').trim().toLowerCase();
  let prSmoke = false;
  if (['true','1','yes','y','on'].includes(rawPrSmoke)) prSmoke = true;
  // Hard override: if caller explicitly exported PR_SMOKE=true, never downgrade later
  if (!prSmoke && process.env.PR_SMOKE && ['true','1','yes','y','on'].includes(rawPrSmoke)) {
    prSmoke = true;
  }
  // Auto-enable in PR contexts if not explicitly disabled
  if (!prSmoke) {
    const ghEvent = (process.env.GITHUB_EVENT_NAME || '').toLowerCase();
    if (ghEvent === 'pull_request' || ghEvent === 'pull_request_target') {
      if (!['false','0','off','no'].includes(rawPrSmoke)) {
        prSmoke = true;
        process.env.PR_SMOKE = 'true';
      }
    }
  }
  if (!prSmoke) {
    // Fallback: accept --pr-smoke flag
    if (process.argv.some(a => /^--pr-smoke$/i.test(a))) {
      prSmoke = true;
      process.env.PR_SMOKE = 'true';
    }
  }
  // Deprecation notice: using only the PR_SMOKE env var (without the --pr-smoke flag) is supported
  // for backward compatibility but will be removed. Prefer invoking with the CLI flag so intent
  // is explicit and resilient across shells / CI runners.
  const cliPrSmokeFlag = process.argv.some(a => /^--pr-smoke$/i.test(a));
  if (!cliPrSmokeFlag && process.env.PR_SMOKE && ['true','1','yes','y','on'].includes(rawPrSmoke)) {
    console.warn('[e2e][deprecation] Detected PR_SMOKE environment variable without --pr-smoke flag. Use: node scripts/run-e2e.js --pr-smoke (env-only activation will be removed).');
  }
  const scriptVersion = 'run-e2e.js:vSMOKE-diag-2';
  console.log(`[e2e] Runner start (${scriptVersion}) PR_SMOKE=${prSmoke} node=${process.version}`);
  // Always snapshot raw E2E_SPEC
  const rawEnvSpecAtStart = process.env.E2E_SPEC;
  // Force clear E2E_SPEC when PR_SMOKE or when raw spec exactly matches the legacy 4-spec pattern (heuristic of accidental narrowing)
  const legacyPattern = /adminOrdersBulkDialogs\.cy\.js.*auth_roles\.cy\.js.*basic_navigation\.cy\.js.*order_status_update\.cy\.js/i;
  if (process.env.E2E_SPEC && (prSmoke || legacyPattern.test(process.env.E2E_SPEC))) {
    console.log('[e2e] Clearing E2E_SPEC early (smoke or legacy-only pattern) to avoid spec narrowing.');
    try { delete process.env.E2E_SPEC; } catch(_) { process.env.E2E_SPEC=''; }
  }
  // Early environment snapshot (spec-related) for debugging hidden narrowing influences
  try {
    const earlyDiagLines = [];
    earlyDiagLines.push(`Start: ${new Date().toISOString()}`);
    earlyDiagLines.push(`PR_SMOKE(raw)=${process.env.PR_SMOKE}`);
    earlyDiagLines.push(`Computed prSmoke=${prSmoke}`);
    const specKeys = Object.keys(process.env).filter(k => /spec/i.test(k));
    earlyDiagLines.push('Spec-related env vars:');
    for (const k of specKeys.sort()) earlyDiagLines.push(`  ${k}=${process.env[k]}`);
    fs.writeFileSync(path.join(frontendDir, 'pre-spec-env.txt'), earlyDiagLines.join('\n') + '\n', 'utf8');
  } catch (e) { console.warn('[e2e] Failed to write pre-spec-env.txt:', e.message || e); }

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
    // Persist meta info for artifacts
    try {
      const metaPath = path.join(frontendDir, 'e2e-meta.txt');
      fs.writeFileSync(metaPath, `MONGO_URI=${mongoUri}\nDB_NAME=${ephemeralDbName}\nAPI_URL=${apiUrl}\n`, 'utf8');
    } catch (_) {}
    backend = runWithLog('node', ['server.js'], { cwd: backendDir, env: backendEnv }, 'e2e-backend');
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
  // Scope reporting
  const scope = {
    mode: {
      attach: attachMode,
      semiAttach,
      ephemeralDb,
    },
    tags: {
      include: process.env.CYPRESS_INCLUDE_TAG || null,
      exclude: process.env.CYPRESS_EXCLUDE_TAG || null,
    },
    selection: {
      viaEnvSpec: process.env.E2E_SPEC || null,
      forceAll: null,
      discoveredTotal: 0,
      excluded: {
        flakyBaseNames: [],
      },
      selectedSpecs: [],
    },
  };
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
  // In CI or task-driven full runs, force running all specs unless explicitly disabled with E2E_USE_ALL=false.
  // However, if E2E_SPEC is provided, honor it even when CI=true.
  const isCI = String(process.env.CI || '').toLowerCase() === 'true';
  const allowFilters = String(process.env.E2E_ALLOW_FILTERS || '').toLowerCase() === 'true';
  let forceAll = isCI && String(process.env.E2E_USE_ALL || 'true').toLowerCase() !== 'false' && !allowFilters;
  // PR_SMOKE should always allow filtering / curated selection regardless of CI defaults
  if (prSmoke) forceAll = false;
  // In forceAll mode we intentionally ignore any parent-provided E2E_SPEC to avoid accidental partial runs.
  scope.selection.forceAll = !!forceAll;
  const cyEnv = { ...process.env, PR_SMOKE: prSmoke ? 'true' : process.env.PR_SMOKE || 'false', CYPRESS_API_URL: apiUrl, CYPRESS_video: isCI ? 'true' : 'false', CYPRESS_CACHE_FOLDER: cypressCache, npm_config_cache: npmCache };
  // Pass a11y control flags through to Cypress.env
  if (typeof process.env.A11Y_ENFORCE !== 'undefined') {
    cyEnv.CYPRESS_A11Y_ENFORCE = process.env.A11Y_ENFORCE;
  }
  if (typeof process.env.A11Y_SKIP !== 'undefined') {
    cyEnv.CYPRESS_A11Y_SKIP = process.env.A11Y_SKIP;
  }
  // Pass through exclude tag (e.g., @flaky) from env in a Cypress-friendly way
  if (process.env.CYPRESS_EXCLUDE_TAG) {
    cyEnv.CYPRESS_EXCLUDE_TAG = process.env.CYPRESS_EXCLUDE_TAG;
  }
  // Pass through include tag (e.g., @smoke) to allow selecting only certain tagged tests
  if (process.env.CYPRESS_INCLUDE_TAG) {
    cyEnv.CYPRESS_INCLUDE_TAG = process.env.CYPRESS_INCLUDE_TAG;
  }
  // If PR_SMOKE is enabled and no explicit tag filters provided, default to include @smoke and exclude @flaky
  // prSmoke computed above
  if (prSmoke) {
    if (!cyEnv.CYPRESS_INCLUDE_TAG && !cyEnv.CYPRESS_EXCLUDE_TAG) {
      cyEnv.CYPRESS_INCLUDE_TAG = 'smoke';
      cyEnv.CYPRESS_EXCLUDE_TAG = 'flaky';
    }
  // Force cypress-grep spec-level filtering assistance (parallel to our tag include)
  cyEnv.CYPRESS_grepTags = '@smoke';
  cyEnv.CYPRESS_grepFilterSpecs = 'true';
    // Ensure legacy or inherited E2E_SPEC does not constrain smoke runs; rely on dynamic discovery + tag filtering
    if (process.env.E2E_SPEC) {
      console.log('[e2e] PR_SMOKE: ignoring inherited E2E_SPEC to avoid missing newly tagged smoke specs.');
      try { delete process.env.E2E_SPEC; } catch(_) { process.env.E2E_SPEC = ''; }
    }
  }
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
  // (cleanup) Removed legacy inclusionSafetyNetApplied safety net logic.
  // Helper to normalize and dedupe spec list strings (forward slashes for stability across OS)
  function normalizeAndDedupe(specList) {
    const seen = new Set();
    const out = [];
    for (const s of specList) {
      if (!s) continue;
      const norm = s.replace(/\\/g, '/');
      if (!seen.has(norm)) { seen.add(norm); out.push(norm); }
    }
    return out;
  }
  function maybeSplitSpecs(list) {
    const total = Number(process.env.E2E_SPLIT_TOTAL || 0);
    const index = Number(process.env.E2E_SPLIT_INDEX || 0);
    if (total > 1 && index >= 0 && index < total) {
      const sorted = [...list].sort();
      const filtered = sorted.filter((_, i) => i % total === index);
      console.log(`[e2e] Spec splitting: ${filtered.length}/${sorted.length} specs for shard ${index + 1}/${total}`);
      return filtered;
    }
    return list;
  }
  if (!prSmoke && !forceAll && process.env.E2E_SPEC) {
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
      const sharded = maybeSplitSpecs(resolved);
      specArg = ['--spec', sharded.join(',')];
      scope.selection.selectedSpecs = sharded;
    } else {
      console.log('[e2e] E2E_SPEC provided but no matching files were found. Running default spec discovery.');
    }
  } else {
    // No explicit spec filter provided; enumerate all specs and pass them explicitly to avoid env/config overrides.
  try {
      if (!process.env.E2E_SPEC) {
        console.warn('[e2e] E2E_SPEC not set; defaulting to full run (all specs).');
      }
      const specRoot = path.join(frontendDir, 'cypress', 'e2e');
      let allSpecs = await listSpecFiles(specRoot);
      scope.selection.discoveredTotal = Array.isArray(allSpecs) ? allSpecs.length : 0;
      // PR_SMOKE: short-circuit here to enforce curated-only selection (ignore full discovery beyond baseline for speed & determinism)
      if (prSmoke) {
        try {
          const curatedConfigPath = path.join(frontendDir, 'cypress', 'smoke', 'curated-smoke.json');
          const curatedConfig = JSON.parse(fs.readFileSync(curatedConfigPath, 'utf8'));
          scope.selection.curatedConfig = curatedConfig;
          const curatedSmokeBase = Array.isArray(curatedConfig.specs) ? curatedConfig.specs : [];
          if (!curatedSmokeBase.length) {
            console.error('[e2e][PR_SMOKE] curated-smoke.json has no specs. Aborting.');
            process.exit(98);
          }
          // Resolve curated specs to existing files
          const byBase = allSpecs.reduce((acc,p)=>{acc[path.basename(p)]=p; return acc;}, {});
          const resolved = [];
          const missingFiles = [];
            for (const base of curatedSmokeBase) {
              if (byBase[base]) resolved.push(path.relative(frontendDir, byBase[base])); else missingFiles.push(base);
            }
          if (missingFiles.length) {
            console.error('[e2e][PR_SMOKE] Missing curated spec file(s):', missingFiles.join(', '));
            process.exit(99);
          }
          const normalized = normalizeAndDedupe(resolved);
          specArg = ['--spec', normalized.join(',')];
          scope.selection.selectedSpecs = normalized;
          scope.selection.curatedSmokeApplied = true;
          scope.selection.smokeSpecFilteringApplied = true;
          console.log(`[e2e] PR_SMOKE: enforcing curated list (${normalized.length} specs).`);
          // Optional tag enforcement
          if (curatedConfig.enforceTags) {
            const missingTags = [];
            for (const rel of normalized) {
              const abs = path.join(frontendDir, rel);
              const content = fs.readFileSync(abs, 'utf8');
              if (!/@smoke\b/i.test(content)) missingTags.push(path.basename(rel));
            }
            if (missingTags.length) {
              console.warn('[e2e][PR_SMOKE] Curated spec(s) missing @smoke tag:', missingTags.join(', '));
            }
          }
        } catch (curErr) {
          console.error('[e2e][PR_SMOKE] Failed to load/apply curated-smoke.json:', curErr.message || curErr);
          process.exit(97);
        }
      } else {
      // Optional: exclude flaky specs for PR smoke runs using a registry
    // prSmoke already computed above
      const useFlakyRegistry = String(process.env.E2E_EXCLUDE_FLAKY || 'true').toLowerCase() !== 'false';
      if (prSmoke && useFlakyRegistry) {
        try {
          const registryPath = path.join(frontendDir, 'cypress', 'flaky-specs.json');
          if (fs.existsSync(registryPath)) {
            const list = JSON.parse(fs.readFileSync(registryPath, 'utf8')) || [];
            if (Array.isArray(list) && list.length) {
              const byName = new Set(list.map((s) => String(s).trim()).filter(Boolean));
              const before = allSpecs.length;
              const excluded = [];
              allSpecs = allSpecs.filter((p) => {
                const base = path.basename(p);
                const hit = byName.has(base);
                if (hit) excluded.push(base);
                return !hit;
              });
              const removed = before - allSpecs.length;
              scope.selection.excluded.flakyBaseNames = excluded;
              if (removed > 0) {
                console.log(`[e2e] PR_SMOKE filtering: excluded ${removed} flaky spec(s) via flaky-specs.json`);
              }
            }
          }
        } catch (e) {
          console.warn('[e2e] Failed to apply flaky registry filter:', e && e.message ? e.message : e);
        }
      }
  if (allSpecs && allSpecs.length && !prSmoke) {
          const rel = allSpecs.map((p) => path.relative(frontendDir, p));
          const sharded = maybeSplitSpecs(rel);
          const normalized = normalizeAndDedupe(sharded);
          specArg = ['--spec', normalized.join(',')];
          console.log(`[e2e] Running specs explicitly: ${normalized.length}/${rel.length} files`);
          scope.selection.selectedSpecs = normalized;
  }

  // PR_SMOKE mode: derive curated list (no-op here when not prSmoke)
  let smokeSpecFilteringApplied = !!scope.selection.curatedSmokeApplied;
  if (prSmoke) {
          // Curated baseline smoke spec set (kept intentionally small + fast)
          let curatedSmokeBase = [];
          try {
            if (scope.selection.curatedConfig && Array.isArray(scope.selection.curatedConfig.specs)) {
              curatedSmokeBase = scope.selection.curatedConfig.specs;
            } else {
              const cfg = JSON.parse(fs.readFileSync(path.join(frontendDir, 'cypress', 'smoke', 'curated-smoke.json'), 'utf8'));
              curatedSmokeBase = Array.isArray(cfg.specs) ? cfg.specs : [];
            }
          } catch (_) {}
          const curatedSet = new Set(curatedSmokeBase);
          try {
            const curatedResolved = allSpecs
              .filter(p => curatedSet.has(path.basename(p)))
              .map(p => path.relative(frontendDir, p));
            if (curatedResolved.length) {
              const normSmoke = normalizeAndDedupe(curatedResolved);
              specArg = ['--spec', normSmoke.join(',')];
              scope.selection.selectedSpecs = normSmoke;
              console.log(`[e2e] PR_SMOKE: using curated smoke spec list (${normSmoke.length}).`);
              smokeSpecFilteringApplied = true;
              const missing = curatedSmokeBase.filter(b => !normSmoke.some(s => s.endsWith(b)));
              if (missing.length) {
                console.warn('[e2e] PR_SMOKE: curated smoke spec(s) missing:', missing.join(', '));
              }
            } else {
              console.warn('[e2e] PR_SMOKE: curated list produced 0 specs; retaining full list.');
            }
          } catch (err) {
            console.warn('[e2e] PR_SMOKE: failed to derive smoke spec list:', err && err.message ? err.message : err);
          }
        }
        // Store flag on scope for later conditional clearing logic
        scope.selection.smokeSpecFilteringApplied = smokeSpecFilteringApplied;
      }
      // In PR_SMOKE retain explicit list if we successfully filtered to smoke specs; only drop if filtering failed
      if (prSmoke) {
        console.log('[e2e] PR_SMOKE: keeping curated explicit spec list (' + scope.selection.selectedSpecs.length + ').');
      }
    } catch (e) {
      console.warn('[e2e] Failed to enumerate specs:', e && e.message ? e.message : e);
    }
  }

  // (Cleanup) Removed legacy spec selection heuristics & inclusion safety net; relying on tag discovery + fail-fast.
  // --- PR_SMOKE fail-fast validation & deep diagnostics ---
  if (prSmoke) {
    try {
      let requiredSmoke = [];
      try {
        const curatedConfig = scope.selection.curatedConfig || JSON.parse(fs.readFileSync(path.join(frontendDir, 'cypress', 'smoke', 'curated-smoke.json'), 'utf8'));
        requiredSmoke = (curatedConfig.specs || []).map(b => `cypress/e2e/${b}`);
      } catch (e) {
        console.warn('[e2e][diag] Failed to load curated-smoke.json for fail-fast:', e.message || e);
      }
      const missingFiles = requiredSmoke.filter(rel => !fs.existsSync(path.join(frontendDir, rel)));
      if (missingFiles.length) {
        console.error('[e2e][fail-fast] Required smoke spec file(s) missing:', missingFiles.join(', '));
        process.exit(96);
      }
      // Derive current selected specs (either from explicit list or scope) BEFORE potential clearing below
      let currentlySelected = new Set();
      if (Array.isArray(specArg) && specArg[0] === '--spec' && specArg[1]) {
        specArg[1].split(',').forEach(s => currentlySelected.add(s.trim()));
      } else if (Array.isArray(scope.selection.selectedSpecs)) {
        scope.selection.selectedSpecs.forEach(s => currentlySelected.add(s));
      }
      const missingInSelection = requiredSmoke.filter(rel => !currentlySelected.has(rel));
      // If we have NO explicit spec list (tag-only mode) we only warn if missing; grep will still pick up tests inside.
      const failFastEnabled = String(process.env.E2E_SMOKE_FAIL_FAST || 'true').toLowerCase() === 'true';
      if (missingInSelection.length) {
        const msg = `[e2e][diag] Required smoke spec(s) not explicitly selected: ${missingInSelection.join(', ')}.`;
        console.warn(msg);
        // Emit a deep diagnostics file to help root cause analysis
        try {
          const diagPath = path.join(frontendDir, 'smoke-specs-debug.txt');
          const specRoot = path.join(frontendDir, 'cypress', 'e2e');
          const all = await listSpecFiles(specRoot);
          const lines = [];
          lines.push('PR_SMOKE diagnostics');
          lines.push(`Timestamp: ${new Date().toISOString()}`);
            lines.push(`FailFastEnabled: ${failFastEnabled}`);
          lines.push('All discovered spec files (relative):');
          for (const abs of all.sort()) {
            lines.push(' - ' + path.relative(frontendDir, abs));
          }
          lines.push('Current specArg: ' + (Array.isArray(specArg) ? specArg.join(' ') : ''));          
          lines.push('Environment preview (filtered for spec-related keys):');
          const envSpecKeys = Object.keys(process.env).filter(k => /spec/i.test(k));
          for (const k of envSpecKeys.sort()) lines.push(` * ${k}=${process.env[k]}`);
          fs.writeFileSync(diagPath, lines.join('\n') + '\n', 'utf8');
          console.log('[e2e][diag] Wrote smoke-specs-debug.txt');
        } catch (e) {
          console.warn('[e2e][diag] Failed to write smoke-specs-debug.txt:', e.message || e);
        }
        if (failFastEnabled && (Array.isArray(specArg) && specArg.length) ) {
          console.error('[e2e][fail-fast] Exiting because required smoke specs were NOT in explicit selection.');
          process.exit(97);
        }
      } else {
        console.log('[e2e][diag] All required smoke specs present in selection.');
        // Optional tag enforcement
        try {
          const enforce = (scope.selection.curatedConfig && scope.selection.curatedConfig.enforceTags) === true;
          if (enforce) {
            const missingTags = [];
            for (const rel of requiredSmoke) {
              const abs = path.join(frontendDir, rel);
              const content = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
              if (!/@smoke\b/i.test(content)) missingTags.push(path.basename(rel));
            }
            if (missingTags.length) {
              console.warn('[e2e][diag] Curated spec(s) missing @smoke tag:', missingTags.join(', '));
            }
          }
        } catch (e) {
          console.warn('[e2e][diag] Tag enforcement check failed:', e.message || e);
        }
      }
    } catch (e) {
      console.warn('[e2e][diag] Smoke fail-fast logic encountered an error:', e.message || e);
    }
  }
  // Write scope report before running Cypress
  try {
    // If we haven't already applied smoke-specific spec filtering, we can optionally clear explicit list.
    // But when smokeSpecFilteringApplied is true we KEEP the explicit --spec to ensure non-smoke specs are excluded even if grep misses.
    if (prSmoke && Array.isArray(specArg) && specArg[0] === '--spec') {
      if (scope.selection.smokeSpecFilteringApplied) {
        console.log('[e2e] PR_SMOKE: retaining explicit smoke spec list (smokeSpecFilteringApplied=true).');
      } else {
        console.log('[e2e] PR_SMOKE: clearing explicit --spec to rely purely on tag discovery (no smokeSpecFilteringApplied).');
        specArg = [];
      }
    }
      if (prSmoke && scope.selection.viaEnvSpec) {
        console.log('[e2e] PR_SMOKE: overriding viaEnvSpec spec list in favor of dynamic smoke discovery.');
        scope.selection.viaEnvSpec = null;
      }
      // If we deleted E2E_SPEC earlier for PR_SMOKE, correct the scope metadata
      if (prSmoke && scope.selection && scope.selection.viaEnvSpec && !process.env.E2E_SPEC) {
        scope.selection.viaEnvSpec = null;
      }
  const scopeJsonPath = path.join(frontendDir, 'scope-report.json');
  const scopeTxtPath = path.join(frontendDir, 'scope-report.txt');
    fs.writeFileSync(scopeJsonPath, JSON.stringify(scope, null, 2), 'utf8');
    const lines = [];
    lines.push('E2E Scope Report');
  // Use cyEnv (final child env) rather than parent process.env so report matches execution
  const effInclude = (cyEnv.CYPRESS_INCLUDE_TAG ? cyEnv.CYPRESS_INCLUDE_TAG : (prSmoke ? 'smoke' : (scope.tags.include || '(none)')));
  const effExclude = (cyEnv.CYPRESS_EXCLUDE_TAG ? cyEnv.CYPRESS_EXCLUDE_TAG : (prSmoke ? 'flaky' : (scope.tags.exclude || '(none)')));
  lines.push(`- include tags: ${effInclude}`);
  lines.push(`- exclude tags: ${effExclude}`);
    lines.push(`- via E2E_SPEC: ${scope.selection.viaEnvSpec ? 'yes' : 'no'}`);
    if (!scope.selection.viaEnvSpec) {
      lines.push(`- discovered specs: ${scope.selection.discoveredTotal}`);
      if (scope.selection.excluded.flakyBaseNames.length) {
        lines.push(`- excluded (flaky registry): ${scope.selection.excluded.flakyBaseNames.join(', ')}`);
      }
    }
    lines.push(`- selected specs: ${scope.selection.selectedSpecs.length}`);
    // Show up to 20 specs to keep it readable
    const preview = scope.selection.selectedSpecs.slice(0, 20).join('\n  ');
    lines.push(`  ${preview}${scope.selection.selectedSpecs.length > 20 ? '\n  ...' : ''}`);
    fs.writeFileSync(scopeTxtPath, lines.join('\n') + '\n', 'utf8');
  } catch (_) {}
  const reportPath = path.join(frontendDir, 'cypress-report.json');
  // Always enforce a wide specPattern to avoid accidental narrowing by env or defaults
  const fullSpecPattern = 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}';
  // Use top-level specPattern for CLI compatibility (Cypress v10+); e2e.specPattern is not a valid CLI key
  const configArg = `baseUrl=${baseUrl},specPattern=${fullSpecPattern}`;
  const resultsDir = path.join(frontendDir, 'cypress-results');
  try {
    fs.mkdirSync(resultsDir, { recursive: true });
    // Clean previous JSON reports to avoid cross-run aggregation
    for (const f of fs.readdirSync(resultsDir)) {
      if (/\.json$/i.test(f)) {
        try { fs.unlinkSync(path.join(resultsDir, f)); } catch (_) {}
      }
    }
  } catch {}
  const cyArgs = ['cypress', 'run', '--browser', e2eBrowser, '--headless', '--config', configArg, '--reporter', 'mochawesome', '--reporter-options', `reportDir=cypress-results,reportFilename=cypress-report,overwrite=false,quiet=true,charts=false,html=false,json=true`, ...specArg];
    // Deduplicate any accidental duplicate spec paths in --spec argument
    try {
      const specIndex = cyArgs.indexOf('--spec');
      if (specIndex !== -1 && cyArgs[specIndex + 1]) {
        const rawList = cyArgs[specIndex + 1].split(',').map(s => s.trim()).filter(Boolean);
        const unique = Array.from(new Set(rawList));
        if (unique.length !== rawList.length) {
          cyArgs[specIndex + 1] = unique.join(',');
          console.log(`[e2e] De-duplicated spec list: ${rawList.length} -> ${unique.length}`);
        }
      }
    } catch (e) { console.warn('[e2e] Failed dedup specArg:', e.message || e); }
  // Final override: for PR_SMOKE rely purely on specPattern + cypress-grep tag filtering so newly added smoke tests are never missed.
  if (prSmoke && specArg.length) {
    console.log('[e2e] PR_SMOKE: executing ONLY curated specs: ' + scope.selection.selectedSpecs.length);
  }
  try {
    // Deep diagnostic logging (temporary)
    try {
      const e2eDir = path.join(frontendDir, 'cypress', 'e2e');
      const dirEntries = fs.readdirSync(e2eDir).filter(f => /\.cy\.js$/i.test(f));
      console.log(`[e2e][debug] e2e dir entries (${dirEntries.length}): ${dirEntries.slice(0,60).join(', ')}`);
    } catch (e) {
      console.log('[e2e][debug] failed to list e2e dir:', e.message);
    }
    console.log('[e2e][debug] PR_SMOKE flag:', prSmoke);
  console.log('[e2e][debug] smokeSpecFilteringApplied:', scope.selection.smokeSpecFilteringApplied);
    console.log('[e2e][debug] cyEnv grepTags:', cyEnv.CYPRESS_grepTags, 'grepFilterSpecs:', cyEnv.CYPRESS_grepFilterSpecs);
    console.log('[e2e][debug] pre-final specArg:', Array.isArray(specArg) ? specArg.join(' ') : '(none)');
    const expose = Object.keys(cyEnv).filter(k => /^CYPRESS_/i.test(k)).reduce((acc,k)=> (acc[k]=cyEnv[k], acc), {});
    console.log('[e2e] Cypress env (filtered):', JSON.stringify(expose));
    console.log('[e2e] Cypress args:', JSON.stringify(cyArgs));
  } catch (_) {}
  // Persist final invocation snapshot for debugging
  try {
    const invPath = path.join(frontendDir, 'cypress-invocation.txt');
    const envPreview = Object.keys(cyEnv).filter(k => /^CYPRESS_/i.test(k) || /PR_SMOKE|E2E_SPEC/i.test(k)).sort().reduce((acc,k)=> (acc[k]=cyEnv[k], acc), {});
    fs.writeFileSync(invPath, JSON.stringify({ prSmoke, args: cyArgs, env: envPreview }, null, 2) + '\n', 'utf8');
  } catch(e) { console.warn('[e2e] Failed to write cypress-invocation.txt:', e.message || e); }
  const cy = run('npx', cyArgs, { cwd: frontendDir, env: cyEnv });
  const cyCode = await new Promise((resolve) => cy.on('close', resolve));
  try {
    const summaryPath = path.join(frontendDir, 'cypress-summary.txt');
    // Aggregate all mochawesome JSON reports in resultsDir
    const files = fs.readdirSync(resultsDir).filter(f => /\.json$/i.test(f));
    if (files.length) {
      let total = { tests: 0, passes: 0, failures: 0, pending: 0, duration: 0 };
      for (const f of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8')) || {};
          const s = data.stats || {};
          total.tests += Number(s.tests || 0);
          total.passes += Number(s.passes || 0);
          total.failures += Number(s.failures || 0);
          total.pending += Number(s.pending || 0);
          total.duration += Number(s.duration || 0);
          // Collect per-spec timing for curated smoke governance
          try {
            if (prSmoke && scope.selection && scope.selection.curatedSmokeApplied) {
              // Each mochawesome JSON has results[0].suites[0].tests[] (depending on nesting)
              if (Array.isArray(data.results)) {
                for (const r of data.results) {
                  const stack = [];
                  if (Array.isArray(r.suites)) stack.push(...r.suites);
                  const specDurations = [];
                  while (stack.length) {
                    const suite = stack.pop();
                    if (!suite) continue;
                    if (Array.isArray(suite.suites)) stack.push(...suite.suites);
                    if (Array.isArray(suite.tests)) {
                      for (const t of suite.tests) {
                        if (t && typeof t.duration === 'number') {
                          specDurations.push(t.duration);
                        }
                      }
                    }
                  }
                  if (r.file && specDurations.length) {
                    if (!scope.__timings) scope.__timings = {};
                    const base = path.basename(r.file);
                    // Sum durations (tests only) as a proxy for spec runtime
                    scope.__timings[base] = (scope.__timings[base] || 0) + specDurations.reduce((a,b)=>a+b,0);
                  }
                }
              }
            }
          } catch (_) {}
        } catch (_) {}
      }
      // Include spec selection info for traceability
      let specInfo = '';
      if (process.env.E2E_SPEC) {
        specInfo = ` spec=${process.env.E2E_SPEC}`;
      } else if (Array.isArray(specArg) && specArg[0] === '--spec' && typeof specArg[1] === 'string') {
        const count = specArg[1].split(',').filter(Boolean).length;
        specInfo = ` specs=${count}`;
      }
      const line = `[e2e] Cypress results: ${total.tests} tests, ${total.passes} passed, ${total.failures} failed${specInfo}`;
      const meta = [];
      if (ephemeralDbName) meta.push(`db=${ephemeralDbName}`);
      if (apiUrl) meta.push(`api=${apiUrl}`);
      const metaLine = meta.length ? ` [${meta.join(' ')}]` : '';
      console.log(line);
      try { fs.writeFileSync(summaryPath, `${line}${metaLine}\n`, 'utf8'); } catch (_) {}
      // Budget check for PR_SMOKE
      if (prSmoke && scope.selection.curatedConfig && scope.selection.curatedConfig.budgetSeconds) {
        const durSec = Math.round((total.duration || 0) / 1000);
        const budget = Number(scope.selection.curatedConfig.budgetSeconds);
        if (durSec > budget) {
          console.warn(`[e2e][PR_SMOKE] Duration ${durSec}s exceeded budget ${budget}s (consider tightening or investigating slow spec).`);
        } else {
          console.log(`[e2e][PR_SMOKE] Duration ${durSec}s within budget ${budget}s.`);
        }
      }
      // Write per-spec timing file for smoke set (milliseconds)
      try {
        if (prSmoke && scope.__timings) {
          const timingPath = path.join(frontendDir, 'smoke-spec-timings.json');
          const sorted = Object.entries(scope.__timings).sort((a,b)=>b[1]-a[1]).reduce((acc,[k,v])=>{acc[k]=v;return acc;},{});
          fs.writeFileSync(timingPath, JSON.stringify({ generated: new Date().toISOString(), durationsMs: sorted }, null, 2));
          // Also copy into test-report folder after it's created (handled later) by keeping path reference
          scope.__timingPath = timingPath;
          // --- Historical timing & governance ---
          try {
            const historyPath = path.join(frontendDir, 'smoke-spec-timings-history.json');
            let history = [];
            if (fs.existsSync(historyPath)) {
              try { history = JSON.parse(fs.readFileSync(historyPath, 'utf8')) || []; } catch (_) { history = []; }
            }
            const entry = { generated: new Date().toISOString(), durationsMs: sorted, totalMs: Object.values(sorted).reduce((a,b)=>a+b,0) };
            history.push(entry);
            // Keep last 40 entries to cap file size
            if (history.length > 40) history = history.slice(history.length - 40);
            fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

            // Compute medians for each spec (excluding current) for drift detection
            const prior = history.slice(0, -1);
            const median = (vals) => { if (!vals.length) return null; const s=vals.slice().sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2? s[m] : Math.round((s[m-1]+s[m])/2); };
            const priorMedians = {};
            if (prior.length) {
              const specNames = Object.keys(sorted);
              for (const name of specNames) {
                const vals = prior.map(e => e.durationsMs[name]).filter(v => typeof v === 'number');
                if (vals.length) priorMedians[name] = median(vals);
              }
            }
            const warnings = [];
            const thresholds = (scope.selection.curatedConfig && scope.selection.curatedConfig.thresholds) || {};
            const ABS_THRESHOLD_MS = Number(thresholds.perSpecAbsMs || 8000);
            const DRIFT_FACTOR = Number(thresholds.driftFactor || 1.5);
            const DRIFT_MIN_INCREASE = Number(thresholds.driftMinIncreaseMs || 500);
            const TOP_HEAVY_SHARE = Number(thresholds.topHeavyShareWarn || 0.4); // fraction of total
            const MOVING_WINDOW = Math.max(1, Number(thresholds.movingAverageWindow || 5));
            const totalMs = Object.values(sorted).reduce((a,b)=>a+b,0) || 1;
            // Compute moving average (last N prior + current not included) for each spec
            const priorForAverages = history.slice(0, -1);
            const movingAverages = {};
            if (priorForAverages.length) {
              const window = priorForAverages.slice(-MOVING_WINDOW);
              for (const name of Object.keys(sorted)) {
                const samples = window.map(r => r.durationsMs[name]).filter(v => typeof v === 'number');
                if (samples.length) {
                  movingAverages[name] = Math.round(samples.reduce((a,b)=>a+b,0)/samples.length);
                }
              }
            }
            for (const [spec, dur] of Object.entries(sorted)) {
              if (dur > ABS_THRESHOLD_MS) {
                warnings.push(`[ABS] ${spec} ${dur}ms exceeds ${ABS_THRESHOLD_MS}ms guideline.`);
              }
              if (priorMedians[spec]) {
                const med = priorMedians[spec];
                if (med > 0 && dur > med * DRIFT_FACTOR && (dur - med) > DRIFT_MIN_INCREASE) {
                  warnings.push(`[DRIFT] ${spec} grew ${ (dur/med).toFixed(2) }x median (${med}ms -> ${dur}ms).`);
                }
              }
              const share = dur / totalMs;
              if (share >= TOP_HEAVY_SHARE) {
                warnings.push(`[HEAVY] ${spec} consumes ${(share*100).toFixed(1)}% of smoke time (>= ${(TOP_HEAVY_SHARE*100).toFixed(0)}%). Consider slimming or splitting.`);
              }
            }
            const governancePath = path.join(frontendDir, 'smoke-governance-report.txt');
            const govLines = [];
            govLines.push('Smoke Governance Report');
            govLines.push(`Generated: ${entry.generated}`);
            govLines.push('');
            govLines.push('Per-spec durations (ms, descending):');
            for (const [spec, dur] of Object.entries(sorted)) {
              const med = priorMedians[spec];
              const share = ((dur / (Object.values(sorted).reduce((a,b)=>a+b,0) || dur)) * 100).toFixed(1);
              const avg = movingAverages[spec];
              let extras = [];
              if (med) extras.push(`median=${med}`);
              if (avg) extras.push(`avgN=${avg}`);
              if (med) {
                const driftVal = dur - med;
                extras.push(`Δmed=${driftVal>=0?'+':''}${driftVal}`);
              }
              govLines.push(`- ${spec}: ${dur}ms (${share}%)${extras.length? ' ['+extras.join(' ')+']':''}`);
            }
            govLines.push('');
            if (warnings.length) {
              govLines.push('Warnings:');
              warnings.forEach(w => govLines.push(`- ${w}`));
            } else {
              govLines.push('Warnings: (none)');
            }
            govLines.push('');
            govLines.push(`Total smoke duration (sum test durations): ${entry.totalMs}ms`);
            if (scope.selection.curatedConfig && scope.selection.curatedConfig.budgetSeconds) {
              govLines.push(`Configured budget: ${scope.selection.curatedConfig.budgetSeconds}s`);
            }
            fs.writeFileSync(governancePath, govLines.join('\n'));
            scope.__governancePath = governancePath;
            // Governance summary JSON for dashboards / CI analytics
            try {
              const summary = {
                generated: entry.generated,
                totalMs: entry.totalMs,
                budgetSeconds: scope.selection.curatedConfig && scope.selection.curatedConfig.budgetSeconds || null,
                budgetMet: (scope.selection.curatedConfig && scope.selection.curatedConfig.budgetSeconds) ? (entry.totalMs/1000) <= scope.selection.curatedConfig.budgetSeconds : null,
                topSpec: Object.entries(sorted)[0] ? { name: Object.entries(sorted)[0][0], ms: Object.entries(sorted)[0][1] } : null,
                warnings,
                perSpec: Object.entries(sorted).map(([name, ms]) => ({ name, ms, median: priorMedians[name]||null, movingAvg: movingAverages[name]||null }))
              };
              const summaryPath = path.join(frontendDir, 'smoke-governance-summary.json');
              fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
              scope.__governanceSummaryPath = summaryPath;
            } catch (sErr) {
              console.warn('[e2e] Failed to write governance summary:', sErr.message||sErr);
            }
            if (warnings.length) {
              console.warn('[e2e][PR_SMOKE] Timing warnings detected:\n' + warnings.join('\n'));
            }
          } catch (gerr) {
            console.warn('[e2e] Failed timing governance step:', gerr && gerr.message ? gerr.message : gerr);
          }
        }
      } catch (e) { console.warn('[e2e] Failed to write smoke-spec-timings.json:', e.message || e); }
    } else {
      const fallback = `[e2e] Cypress finished with exit code ${cyCode}. No JSON reports found in ${resultsDir}.`;
      console.warn(fallback);
      try { fs.writeFileSync(summaryPath, `${fallback}\n`, 'utf8'); } catch (_) {}
    }
    // Copy artifacts into a timestamped test-report folder for this run
    try {
      const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
      const reportRoot = path.join(frontendDir, 'test-report');
      const reportDir = path.join(reportRoot, stamp);
      fs.mkdirSync(reportDir, { recursive: true });
      // Copy cypress-results/*
      for (const f of fs.readdirSync(resultsDir)) {
        const src = path.join(resultsDir, f);
        const dest = path.join(reportDir, f);
        try { fs.copyFileSync(src, dest); } catch (_) {}
      }
      // Copy summary and meta if present
      try { fs.copyFileSync(summaryPath, path.join(reportDir, path.basename(summaryPath))); } catch (_) {}
      const metaPath = path.join(frontendDir, 'e2e-meta.txt');
      if (fs.existsSync(metaPath)) {
        try { fs.copyFileSync(metaPath, path.join(reportDir, 'e2e-meta.txt')); } catch (_) {}
      }
      // Copy scope report if present
      const scopeJsonPath = path.join(frontendDir, 'scope-report.json');
      const scopeTxtPath = path.join(frontendDir, 'scope-report.txt');
      if (fs.existsSync(scopeJsonPath)) {
        try { fs.copyFileSync(scopeJsonPath, path.join(reportDir, 'scope-report.json')); } catch (_) {}
      }
      if (fs.existsSync(scopeTxtPath)) {
        try { fs.copyFileSync(scopeTxtPath, path.join(reportDir, 'scope-report.txt')); } catch (_) {}
      }
      const smokeTiming = path.join(frontendDir, 'smoke-spec-timings.json');
      if (fs.existsSync(smokeTiming)) {
        try { fs.copyFileSync(smokeTiming, path.join(reportDir, 'smoke-spec-timings.json')); } catch (_) {}
      }
      const smokeGov = path.join(frontendDir, 'smoke-governance-report.txt');
      if (fs.existsSync(smokeGov)) {
        try { fs.copyFileSync(smokeGov, path.join(reportDir, 'smoke-governance-report.txt')); } catch (_) {}
      }
      console.log(`[e2e] Artifacts copied to ${path.relative(frontendDir, reportDir)}`);
    } catch (e) {
      console.warn('[e2e] Failed to copy artifacts to test-report:', e && e.message ? e.message : e);
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

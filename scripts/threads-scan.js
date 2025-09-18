#!/usr/bin/env node
// threads-scan.js
// Scans repository for behavioral thread tags (@thread:<slug>) across layers and
// validates coverage against threads.map.json requirements.
//
// Layers inferred by path patterns:
//   story:   *.stories.(js|jsx|ts|tsx)
//   e2e:     frontend/cypress/e2e/** (Cypress *.cy.* files)
//   frontend: frontend/src/**/*.(test|spec).*
//   backend:  backend/tests/**/*.(test|spec).*
//
// Output:
//   - Console summary table
//   - JSON artifact: threads-report.json (at repo root)
//
// Exit behavior:
//   By default: never exits non-zero (adoption-friendly) even if critical gaps.
//   Strict mode: pass --strict or set THREADS_STRICT=1 to fail on critical gaps.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAP_PATH = path.join(ROOT, 'threads.map.json');
const REPORT_PATH = path.join(ROOT, 'threads-report.json');
const IGNORES_FILE = path.join(ROOT, '.threads', 'ignore.txt');

if (!fs.existsSync(MAP_PATH)) {
  console.error('[threads] threads.map.json not found at repo root');
  process.exit(1);
}

const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
const definedThreads = map.threads || {};
const TAG_PREFIX = map.naming?.tagPrefix || '@thread:';
const TAG_REGEX = new RegExp(`${TAG_PREFIX}([a-z0-9_-]+)`, 'g');

// Simple recursive walk with prunes
function walk(dir, accept) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  const SKIP_DIRS = new Set(['node_modules', 'coverage', 'dist', 'build', '.git', 'videos', 'screenshots']);
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        stack.push(full);
      } else if (accept(full)) {
        out.push(full);
      }
    }
  }
  return out;
}

// Heuristics for layer detection
function detectLayer(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (/\.stories\.[jt]sx?$/.test(rel)) return 'story';
  if (/frontend\/cypress\/e2e\/.*\.cy\.[jt]sx?$/.test(rel)) return 'e2e';
  if (/frontend\/src\/.*\.(test|spec)\.[jt]sx?$/.test(rel)) return 'frontend';
  if (/backend\/tests\/.*\.(test|spec)\.[jt]sx?$/.test(rel)) return 'backend';
  return null; // ignore other files for now
}

const candidateFiles = walk(ROOT, (f) => /\.(js|jsx|ts|tsx)$/.test(f) && /(stories|\.cy\.|(test|spec)\.)/.test(f));

const threadIndex = {}; // slug -> { layers: {layer: Set(files)}, allFiles:Set }

for (const file of candidateFiles) {
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch { continue; }
  if (!TAG_REGEX.test(txt)) continue; // quick test
  TAG_REGEX.lastIndex = 0; // reset due to global
  let m;
  const layer = detectLayer(file);
  while ((m = TAG_REGEX.exec(txt))) {
    const slug = m[1];
    if (!threadIndex[slug]) threadIndex[slug] = { layers: { story: new Set(), frontend: new Set(), backend: new Set(), e2e: new Set() }, allFiles: new Set() };
    if (layer) threadIndex[slug].layers[layer].add(path.relative(ROOT, file));
    threadIndex[slug].allFiles.add(path.relative(ROOT, file));
  }
}

// Build report
const report = { generatedAt: new Date().toISOString(), tagPrefix: TAG_PREFIX, threads: {} };
const args = process.argv.slice(2);
const ignoreArg = args.find(a => a.startsWith('--ignore='));
function getIgnoreSet() {
  const set = new Set();
  const fromArg = ignoreArg ? ignoreArg.split('=')[1] : '';
  const fromEnv = process.env.THREADS_IGNORE || '';
  const addMany = (s) => (s || '').split(/[\n,]/).map(x => x.trim()).filter(Boolean).forEach(v => set.add(v));
  addMany(fromArg);
  addMany(fromEnv);
  try {
    if (fs.existsSync(IGNORES_FILE)) addMany(fs.readFileSync(IGNORES_FILE, 'utf8'));
  } catch {}
  return set;
}
const IGNORE = getIgnoreSet();
let failures = 0;

for (const [slug, meta] of Object.entries(definedThreads)) {
  if (IGNORE.has(slug)) continue;
  const entry = threadIndex[slug] || { layers: { story: new Set(), frontend: new Set(), backend: new Set(), e2e: new Set() }, allFiles: new Set() };
  const layerFiles = Object.fromEntries(Object.entries(entry.layers).map(([k, v]) => [k, Array.from(v).sort()]));
  const missing = (meta.requiredLayers || []).filter((l) => layerFiles[l].length === 0);
  const coveredLayers = Object.keys(layerFiles).filter((l) => layerFiles[l].length > 0);
  const coverageRatio = meta.requiredLayers?.length ? ((meta.requiredLayers.length - missing.length) / meta.requiredLayers.length) : 1;
  const status = missing.length === 0 ? 'OK' : (meta.critical ? 'MISSING_CRITICAL' : 'INCOMPLETE');
  if (status === 'MISSING_CRITICAL') failures++;
  report.threads[slug] = {
    description: meta.description,
    requiredLayers: meta.requiredLayers,
    critical: !!meta.critical,
    coveredLayers,
    missingLayers: missing,
    coverageRatio: Number(coverageRatio.toFixed(2)),
    files: layerFiles
  };
}

// Include any ad-hoc tags discovered but not defined
for (const slug of Object.keys(threadIndex)) {
  if (IGNORE.has(slug)) continue;
  if (report.threads[slug]) continue;
  const entry = threadIndex[slug];
  const layerFiles = Object.fromEntries(Object.entries(entry.layers).map(([k, v]) => [k, Array.from(v).sort()]));
  report.threads[slug] = {
    description: '(undefined thread — add to threads.map.json)',
    requiredLayers: [],
    critical: false,
    coveredLayers: Object.keys(layerFiles).filter((l) => layerFiles[l].length > 0),
    missingLayers: [],
    coverageRatio: 1,
    files: layerFiles
  };
}

fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

// Optional baseline governance (delta-fail only on regressions)
// Args: --baseline=path, --update-baseline, --strict
const baselineArg = args.find(a => a.startsWith('--baseline='));
const baselinePath = baselineArg ? baselineArg.split('=')[1] : null;
const updateBaseline = args.includes('--update-baseline');
let regressionFailures = 0;
let baselineNote = '';
if (baselinePath && fs.existsSync(baselinePath)) {
  try {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    // For each thread that was OK in baseline (critical only), ensure it's still OK now.
    for (const [slug, b] of Object.entries(baseline.threads || {})) {
      if (IGNORE.has(slug)) continue;
      const wasCritical = !!b.critical;
      const wasOK = b.missingLayers && b.missingLayers.length === 0;
      if (wasCritical && wasOK) {
        const now = report.threads[slug];
        if (!now || (now.missingLayers && now.missingLayers.length > 0)) {
          regressionFailures++;
          console.error(`[threads][regression] ${slug} was OK in baseline but is missing layers now: ${(now && now.missingLayers || []).join(',') || 'unknown'}`);
        }
      }
    }
    baselineNote = `(baseline compared: ${path.relative(ROOT, baselinePath)})`;
  } catch (e) {
    console.warn('[threads] Could not parse baseline:', e.message);
  }
}

if (updateBaseline && baselinePath) {
  try {
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, JSON.stringify(report, null, 2));
    console.log(`[threads] Baseline updated at ${baselinePath}`);
  } catch (e) {
    console.error('[threads] Failed to update baseline:', e.message);
  }
}

// Console summary
function pad(str, len) { return (str + ' '.repeat(len)).slice(0, len); }
const rows = [
  ['Thread', 'Req', 'Covered', 'Missing', 'Critical', 'Status']
];
for (const [slug, r] of Object.entries(report.threads)) {
  const missing = r.missingLayers.join(',');
  rows.push([
    slug,
    String(r.requiredLayers.length),
    String(r.coveredLayers.length),
    missing || '-',
    r.critical ? 'Y' : 'N',
    r.missingLayers.length ? (r.critical ? 'FAIL' : 'WARN') : 'OK'
  ]);
}
const colWidths = rows[0].map((_, i) => Math.max(...rows.map(r => r[i].length)) + 2);
for (const r of rows) {
  console.log(r.map((c, i) => pad(c, colWidths[i])).join(''));
}

const strict = process.argv.includes('--strict') || process.env.THREADS_STRICT === '1';
if (failures) {
  const msg = `[threads] ${failures} critical thread(s) missing required layer coverage.`;
  if (strict) {
    console.error(`\n${msg} (strict mode) -> failing build.`);
    process.exit(1);
  } else {
    console.warn(`\n${msg} (non-strict mode; not failing). Use --strict to enforce.`);
  }
} else {
  console.log('\n[threads] OK');
}

if (regressionFailures) {
  console.error(`\n[threads] ${regressionFailures} regression(s) vs baseline ${baselineNote}.`);
  process.exit(1);
}

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/*
 Staged Timing Capture Script (Phase 1)
 Runs candidate specs individually multiple times to gather:
  - per-run duration (ms)
  - median & average
  - moving window (same as average here; governance window handled later)
  - share vs current curated smoke total (if governance summary exists)
  - predicted share if added to smoke set
  - tag recommendations (persona, trust, smoke readiness)

 Usage: node scripts/capture-candidate-specs.js [--loops 3] [--spec vendor_product_upload.cy.js]
        CAPTURE_LOOPS=5 node scripts/capture-candidate-specs.js

 Environment notes:
  - Forces E2E_ALLOW_FILTERS=true so single-spec selection honored.
  - Does NOT set PR_SMOKE to avoid curated enforcement.
  - Each run is isolated (backend + frontend start) for determinism.
  - Overhead acceptable for small N (6 specs * 3 loops).
*/

const frontendDir = path.resolve(__dirname, '..');
const resultsDir = path.join(frontendDir, 'cypress-results');
const governanceSummaryPath = path.join(frontendDir, 'smoke-governance-summary.json');

const candidateMeta = [
  { spec: 'vendor_product_upload.cy.js', persona: 'vendor', purpose: 'Upload flow, trust-critical', tags: ['persona:vendor','trust'] },
  { spec: 'vendor_forbidden_action.cy.js', persona: 'vendor', purpose: 'Role enforcement, edge-case', tags: ['persona:vendor','trust','security'] },
  { spec: 'customer_checkout.cy.js', persona: 'customer', purpose: 'Purchase flow, transactional', tags: ['persona:customer','checkout-flow'] },
  { spec: 'customerFlow.cy.js', persona: 'customer', purpose: 'Lifecycle, multi-step', tags: ['persona:customer','journey'] },
  { spec: 'auth_roles.cy.js', persona: 'admin', purpose: 'Permission matrix', tags: ['persona:admin','roles','security'] },
  { spec: 'adminOrdersBulkDialogs.cy.js', persona: 'admin', purpose: 'Modal interactions', tags: ['persona:admin','ui'] }
];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { loops: Number(process.env.CAPTURE_LOOPS || 3) };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--loops' && args[i+1]) { opts.loops = Number(args[++i]); continue; }
    if (a === '--spec' && args[i+1]) { opts.spec = args[++i]; continue; }
  }
  if (!Number.isFinite(opts.loops) || opts.loops < 1) opts.loops = 3;
  return opts;
}

function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a,b)=>a-b); const m = Math.floor(s.length/2);
  return s.length % 2 ? s[m] : Math.round((s[m-1] + s[m]) / 2);
}

function readCurrentSmokeTotal() {
  try {
    if (fs.existsSync(governanceSummaryPath)) {
      const j = JSON.parse(fs.readFileSync(governanceSummaryPath,'utf8'));
      if (j && typeof j.totalMs === 'number') return j.totalMs;
    }
  } catch(_) {}
  return null;
}

function runSpec(specBase, loops) {
  const specRel = `cypress/e2e/${specBase}`;
  if (!fs.existsSync(path.join(frontendDir, specRel))) {
    return { spec: specBase, error: 'Spec file not found', runs: [] };
  }
  const runs = [];
  for (let i=0;i<loops;i++) {
    console.log(`\n[capture] Run ${i+1}/${loops} for ${specBase} ...`);
    // Clean previous JSONs so we only parse this spec's data
    try { if (fs.existsSync(resultsDir)) {
      for (const f of fs.readdirSync(resultsDir)) if (/\.json$/i.test(f)) fs.unlinkSync(path.join(resultsDir,f));
    } } catch(_) {}
    const env = { ...process.env, E2E_ALLOW_FILTERS: 'true', E2E_SPEC: specRel };
    delete env.PR_SMOKE; // ensure curated enforcement not applied
    const cmd = process.execPath; // node
    const child = spawnSync(cmd, ['scripts/run-e2e.js'], { cwd: frontendDir, env, stdio: 'inherit' });
    if (child.status !== 0) {
      runs.push({ error: `exit ${child.status}` });
      continue;
    }
    // Aggregate mochawesome json durations
    let durationMs = 0; let testDurations = 0;
    try {
      const jsonFiles = fs.readdirSync(resultsDir).filter(f=>/\.json$/i.test(f));
      for (const jf of jsonFiles) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(resultsDir,jf),'utf8'));
          if (data && data.stats && typeof data.stats.duration === 'number') {
            durationMs += data.stats.duration;
          }
          // fallback: sum test durations
          if (Array.isArray(data.results)) {
            for (const r of data.results) {
              if (Array.isArray(r.suites)) {
                const stack = [...r.suites];
                while (stack.length) {
                  const s = stack.pop();
                  if (!s) continue;
                  if (Array.isArray(s.suites)) stack.push(...s.suites);
                  if (Array.isArray(s.tests)) {
                    for (const t of s.tests) if (t && typeof t.duration === 'number') testDurations += t.duration;
                  }
                }
              }
            }
          }
        } catch(_) {}
      }
      if (!durationMs && testDurations) durationMs = testDurations; // fallback
    } catch(err) {
      runs.push({ error: 'parse failure: '+(err.message||err) });
      continue;
    }
    runs.push({ durationMs });
  }
  const good = runs.filter(r=> typeof r.durationMs === 'number');
  const durations = good.map(r=>r.durationMs);
  const med = median(durations);
  const avg = durations.length ? Math.round(durations.reduce((a,b)=>a+b,0)/durations.length) : 0;
  return { spec: specBase, runs, medianMs: med, averageMs: avg };
}

function main() {
  const opts = parseArgs();
  const smokeTotal = readCurrentSmokeTotal();
  const selected = opts.spec ? candidateMeta.filter(c => c.spec === opts.spec) : candidateMeta;
  if (!selected.length) {
    console.error('No candidate specs matched.');
    process.exit(2);
  }
  const report = { generated: new Date().toISOString(), loops: opts.loops, smokeBaselineMs: smokeTotal, specs: [] };
  for (const meta of selected) {
    const result = runSpec(meta.spec, opts.loops);
    const median = result.medianMs || 0;
    const share = smokeTotal ? median / smokeTotal : null;
    const predictedTotal = smokeTotal ? smokeTotal + median : null;
    const predictedShare = predictedTotal ? median / predictedTotal : null;
    report.specs.push({
      ...meta,
      ...result,
      shareVsCurrent: share,
      predictedNewShare: predictedShare,
      predictedNewTotalMs: predictedTotal,
      tagRecommendations: [`@persona:${meta.persona}`].concat(meta.tags.map(t=> t.startsWith('persona:')? t : '@'+t))
    });
  }
  const jsonPath = path.join(frontendDir, 'capture-candidate-specs-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  // Markdown summary
  const lines = [];
  lines.push('# Candidate Spec Timing Capture');
  lines.push(`Generated: ${report.generated}`);
  lines.push(`Loops per spec: ${report.loops}`);
  if (smokeTotal) lines.push(`Current curated smoke total (last run): ${(smokeTotal/1000).toFixed(2)}s`);
  lines.push('');
  for (const s of report.specs) {
    lines.push(`## ${s.spec}`);
    lines.push(`Persona: ${s.persona}`);
    lines.push(`Purpose: ${s.purpose}`);
    if (s.error) { lines.push(`ERROR: ${s.error}`); lines.push(''); continue; }
    const durList = s.runs.map(r=> typeof r.durationMs==='number'? r.durationMs : 'ERR').join(', ');
    lines.push(`Runs (ms): ${durList}`);
    lines.push(`Median: ${s.medianMs} ms  |  Avg: ${s.averageMs} ms`);
    if (smokeTotal) {
      lines.push(`Share vs current smoke: ${(s.shareVsCurrent*100).toFixed(2)}%`);
      lines.push(`Predicted share if added: ${(s.predictedNewShare*100).toFixed(2)}% (new total ~ ${(s.predictedNewTotalMs/1000).toFixed(2)}s)`);
    }
    lines.push(`Tag recommendations: ${s.tagRecommendations.join(' ')}`);
    lines.push('');
  }
  fs.writeFileSync(path.join(frontendDir, 'capture-candidate-specs-report.md'), lines.join('\n'));
  console.log('Candidate timing capture complete.');
}

main();

const fs = require('fs');
const path = require('path');

function main() {
  const frontendDir = path.resolve(__dirname, '..');
  const resultsDir = path.join(frontendDir, 'cypress-results');
  const scopeTxt = safeRead(path.join(frontendDir, 'scope-report.txt'));
  const summaryTxt = safeRead(path.join(frontendDir, 'cypress-summary.txt'));
  const timingsJson = readJson(path.join(frontendDir, 'smoke-spec-timings.json'));
  const governanceTxt = safeRead(path.join(frontendDir, 'smoke-governance-report.txt'));
  const governanceSummary = readJson(path.join(frontendDir, 'smoke-governance-summary.json'));
  const history = readJson(path.join(frontendDir, 'smoke-spec-timings-history.json'));
  const curatedCfg = readJson(path.join(frontendDir, 'cypress', 'smoke', 'curated-smoke.json')) || {};
  const artifacts = listJson(resultsDir);
  // Prefer tag audit JSON if present
  const tagAuditJson = readTagAudit(path.join(resultsDir, 'tag-audit.json'));

  const lines = [];
  lines.push('### E2E Run Summary');
  if (summaryTxt) {
    lines.push('');
    lines.push('Summary:');
    lines.push(summaryTxt.trim());
  }
  if (scopeTxt) {
    lines.push('');
    lines.push('Scope (first 20 lines):');
    const scopeLines = scopeTxt.split(/\r?\n/).slice(0, 20).join('\n');
    lines.push(scopeLines);
  }
  lines.push('');
  lines.push('Artifacts:');
  for (const f of artifacts) lines.push(`- ${path.basename(f)}`);
  lines.push('');
  lines.push('Tags: ' + tagsLine());

  // Performance summary (only when smoke timings present)
  if (timingsJson && timingsJson.durationsMs) {
    const total = Object.values(timingsJson.durationsMs).reduce((a,b)=>a+b,0);
    const entries = Object.entries(timingsJson.durationsMs);
    const top = entries[0];
    lines.push('');
    lines.push('Smoke Performance:');
    lines.push(`- Total (sum test durations): ${(total/1000).toFixed(1)}s`);
    if (top) {
      const share = ((top[1]/total)*100).toFixed(1);
      lines.push(`- Heaviest spec: ${top[0]} ${(top[1]/1000).toFixed(2)}s (${share}% of time)`);
    }
    // Extract warnings from governance report if present
    if (governanceTxt) {
      const warnSection = governanceTxt.split(/\r?\n/);
      const warnIndex = warnSection.findIndex(l => /^Warnings:/i.test(l));
      if (warnIndex !== -1) {
        const warnLines = [];
        for (let i = warnIndex+1; i < warnSection.length; i++) {
          const line = warnSection[i];
            if (!line.trim()) break;
            if (/^Total smoke duration/i.test(line)) break;
          if (/^- /.test(line)) warnLines.push(line.replace(/^-\s*/, ''));
        }
        if (warnLines.length && !/^\(none\)/i.test(warnLines[0])) {
          lines.push('- Warnings:');
          warnLines.forEach(w => lines.push(`  - ${w}`));
        } else {
          lines.push('- Warnings: none');
        }
      }
    }
    // Median + drift table (exclude current run from median calc)
    if (Array.isArray(history) && history.length >= 1) {
      const prior = history.slice(0, -1); // exclude current (last) entry
      const current = history[history.length - 1];
      if (current && current.durationsMs) {
        const median = (vals)=>{ if(!vals.length) return null; const s=vals.slice().sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2? s[m] : Math.round((s[m-1]+s[m])/2); };
        const priorMedians = {};
        if (prior.length) {
          const specNames = Object.keys(current.durationsMs);
          for (const name of specNames) {
            const vals = prior.map(r=> r.durationsMs[name]).filter(v=> typeof v === 'number');
            if (vals.length) priorMedians[name] = median(vals);
          }
        }
        const thresholds = (curatedCfg.thresholds)||{};
        const driftFactor = Number(thresholds.driftFactor||1.5);
        const driftMinIncrease = Number(thresholds.driftMinIncreaseMs||500);
        const absMs = Number(thresholds.perSpecAbsMs||8000);
        const heavyShare = Number(thresholds.topHeavyShareWarn||0.4);
        const currentSorted = Object.entries(current.durationsMs).sort((a,b)=> b[1]-a[1]);
        lines.push('');
        lines.push('Smoke Timing (current vs median):');
        currentSorted.forEach(([spec, dur]) => {
          const med = priorMedians[spec];
          if (!med) {
            lines.push(`- ${spec}: ${(dur/1000).toFixed(2)}s (first observed)`);
          } else {
            const delta = dur - med;
            const factor = (dur/med).toFixed(2);
            const sign = delta >=0 ? '+' : '';
            lines.push(`- ${spec}: ${(dur/1000).toFixed(2)}s (median ${(med/1000).toFixed(2)}s, ${sign}${(delta/1000).toFixed(2)}s, x${factor})`);
          }
        });
        // Drift alerts
        const driftAlerts = [];
        const totalMs = Object.values(current.durationsMs).reduce((a,b)=>a+b,0)||1;
        for (const [spec, dur] of currentSorted) {
          const med = priorMedians[spec];
          if (med && med>0) {
            if (dur > med * driftFactor && (dur-med) > driftMinIncrease) {
              driftAlerts.push(`[DRIFT] ${spec} x${(dur/med).toFixed(2)} (${med}ms -> ${dur}ms)`);
            }
          }
          if (dur > absMs) {
            driftAlerts.push(`[ABS] ${spec} ${dur}ms > ${absMs}ms`);
          }
          const share = dur/totalMs;
          if (share >= heavyShare) {
            driftAlerts.push(`[HEAVY] ${spec} ${(share*100).toFixed(1)}% >= ${(heavyShare*100).toFixed(0)}%`);
          }
        }
        if (driftAlerts.length) {
          lines.push('');
          lines.push('Drift Alerts:');
          driftAlerts.forEach(a => lines.push(`- ${a}`));
        }
      }
    }
  }

  // Governance summary (if summary JSON present)
  if (governanceSummary) {
    lines.push('');
    lines.push('Governance Summary:');
    const totalS = (governanceSummary.totalMs/1000).toFixed(1);
    lines.push(`- Total: ${totalS}s (budget ${governanceSummary.budgetSeconds || 'n/a'}s => ${governanceSummary.budgetMet ? 'OK' : 'EXCEEDED'})`);
    if (governanceSummary.topSpec) {
      lines.push(`- Top Spec: ${governanceSummary.topSpec.name} ${(governanceSummary.topSpec.ms/1000).toFixed(2)}s`);
    }
    if (governanceSummary.warnings && governanceSummary.warnings.length) {
      lines.push('- Warnings:');
      governanceSummary.warnings.forEach(w => lines.push(`  - ${w}`));
    } else {
      lines.push('- Warnings: none');
    }
    // Runtime budget heatmap (textual): bar of shares scaled to 20 chars
    if (Array.isArray(governanceSummary.perSpec)) {
      lines.push('');
      lines.push('Runtime Share (heatmap):');
      const total = governanceSummary.totalMs || 1;
      const maxBar = 20;
      governanceSummary.perSpec.forEach(p => {
        const share = p.ms / total;
        const barLen = Math.max(1, Math.round(share * maxBar));
        const bar = '#'.repeat(barLen).padEnd(maxBar, '.');
        lines.push(`- ${p.name.padEnd(30)} |${bar}| ${(share*100).toFixed(1)}%`);
      });
    }
  }

  const flakySpecs = extractFlakySpecs(tagAuditJson);
  if (flakySpecs.length) {
    lines.push('');
    lines.push(`Quarantined (@flaky) specs (${flakySpecs.length}):`);
    flakySpecs.slice(0, 15).forEach(s => lines.push(`- ${s}`));
    if (flakySpecs.length > 15) lines.push(`... (+${flakySpecs.length - 15} more)`);
  } else {
    lines.push('');
    lines.push('Quarantined (@flaky) specs: none');
  }

  fs.writeFileSync(path.join(frontendDir, 'pr-comment.md'), lines.join('\n'));
  console.log('PR comment written to pr-comment.md');
}

function tagsLine() {
  const prSmoke = String(process.env.PR_SMOKE||'').toLowerCase()==='true' || process.argv.some(a => a === '--pr-smoke');
  const include = process.env.CYPRESS_INCLUDE_TAG || (prSmoke ? 'smoke' : '');
  const exclude = process.env.CYPRESS_EXCLUDE_TAG || (prSmoke ? 'flaky' : '');
  const parts = [];
  if (include) parts.push(`include: ${include}`);
  if (exclude) parts.push(`exclude: ${exclude}`);
  return parts.length ? parts.join(' | ') : 'none';
}

function listJson(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(f => /\.json$/i.test(f))
      .map(f => path.join(dir, f));
  } catch { return []; }
}

function safeRead(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }
function readJson(p) { try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return null; } }

function readTagAudit(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function extractFlakySpecs(audit) {
  if (!audit || !Array.isArray(audit.specs)) return [];
  return audit.specs.filter(s => Array.isArray(s.tags) && s.tags.includes('flaky')).map(s => s.file).sort();
}

main();

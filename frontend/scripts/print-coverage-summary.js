#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function loadJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

// Try summary first; fall back to final (per-file) and aggregate if needed
const summary = loadJson(path.join(__dirname, '..', 'coverage', 'coverage-summary.json'))
  || loadJson(path.join(__dirname, '..', 'coverage', 'coverage-final.json'));

if (!summary) {
  console.log('No coverage summary found. Run test:coverage first.');
  process.exit(0);
}

// If we only have coverage-final.json (per-file), aggregate a total
function computeTotalFromCoverageFinal(data) {
  const keys = ['statements', 'branches', 'functions', 'lines'];
  const acc = Object.fromEntries(keys.map(k => [k, { covered: 0, total: 0 }]));
  for (const file of Object.values(data)) {
    if (file && typeof file === 'object') {
      for (const k of keys) {
        const m = file[k];
        if (m && typeof m.covered === 'number' && typeof m.total === 'number') {
          acc[k].covered += m.covered;
          acc[k].total += m.total;
        }
      }
    }
  }
  const toPct = (covered, total) => (total > 0 ? Math.round((covered / total) * 10000) / 100 : 0);
  return {
    statements: { pct: toPct(acc.statements.covered, acc.statements.total) },
    branches: { pct: toPct(acc.branches.covered, acc.branches.total) },
    functions: { pct: toPct(acc.functions.covered, acc.functions.total) },
    lines: { pct: toPct(acc.lines.covered, acc.lines.total) },
  };
}

// Jest writes a top-level total key in coverage-summary.json
let total = summary.total || summary;
// Detect if this looks like a per-file map (coverage-final) and aggregate
if (!summary.total && !('lines' in summary) && !('branches' in summary) && !('functions' in summary) && !('statements' in summary)) {
  total = computeTotalFromCoverageFinal(summary);
}
const line = total.lines || total.statements || {};
const branches = total.branches || {};
const functions = total.functions || {};

const pct = (v) => (v && typeof v.pct === 'number' ? v.pct : 0);
const out = {
  lines: pct(line),
  branches: pct(branches),
  functions: pct(functions),
  statements: pct(total.statements || {})
};

console.log(`FRONTEND COVERAGE SUMMARY => Lines: ${out.lines}% | Branches: ${out.branches}% | Funcs: ${out.functions}% | Stmts: ${out.statements}%`);
// Optional CI-friendly single-line output
const isCi = process.argv.includes('--ci');
if (isCi) {
  console.log(
    `COVERAGE lines=${out.lines} branches=${out.branches} functions=${out.functions} statements=${out.statements}`
  );
}

// Emit a short JSON for workflow consumption
const covDir = path.join(__dirname, '..', 'coverage');
try { fs.mkdirSync(covDir, { recursive: true }); } catch {}
const artifact = path.join(covDir, 'coverage-compact.json');
fs.writeFileSync(artifact, JSON.stringify(out, null, 2));
console.log('Wrote compact summary to coverage/coverage-compact.json');

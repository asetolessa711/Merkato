#!/usr/bin/env node
// Reads threads-report.json and prints a concise Markdown summary to stdout
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'threads-report.json');

if (!fs.existsSync(REPORT)) {
  console.error('threads-report.json not found');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
const ignoreSet = new Set();
try {
  const ig = path.join(ROOT, '.threads', 'ignore.txt');
  if (fs.existsSync(ig)) {
    fs.readFileSync(ig, 'utf8')
      .split(/\n|,/)
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(x => ignoreSet.add(x));
  }
} catch {}
const entries = Object.entries(data.threads || {}).filter(([slug]) => !ignoreSet.has(slug));
const rows = entries.map(([slug, t]) => ({
  slug,
  critical: !!t.critical,
  req: (t.requiredLayers || []).length,
  covered: (t.coveredLayers || []).length,
  missing: (t.missingLayers || []).join(', ') || '-',
  status: (t.missingLayers || []).length ? (t.critical ? 'FAIL' : 'WARN') : 'OK'
}));

const crit = rows.filter(r => r.critical);
const noncrit = rows.filter(r => !r.critical);
const critOk = crit.filter(r => r.status === 'OK').length;
const nonOk = noncrit.filter(r => r.status === 'OK').length;

function table(rows) {
  const header = ['Thread', 'Critical', 'Req', 'Covered', 'Missing', 'Status'];
  const body = rows.map(r => [r.slug, r.critical ? 'Y' : 'N', String(r.req), String(r.covered), r.missing, r.status]);
  function pad(s, n) { return (s + ' '.repeat(n)).slice(0, n); }
  const widths = header.map((_, i) => Math.max(header[i].length, ...body.map(row => row[i].length)));
  const out = [];
  out.push('| ' + header.map((h, i) => pad(h, widths[i])).join(' | ') + ' |');
  out.push('| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |');
  for (const row of body) out.push('| ' + row.map((c, i) => pad(c, widths[i])).join(' | ') + ' |');
  return out.join('\n');
}

console.log('## Threads Summary');
console.log('');
console.log(`- Critical OK: ${critOk}/${crit.length}`);
console.log(`- Non-critical OK: ${nonOk}/${noncrit.length}`);
console.log(`- Ignored: ${[...ignoreSet].length}`);
console.log(`- Governance: baseline comparison active; strict mode on PRs`);
console.log('');
const sorted = rows.sort((a, b) => (b.critical - a.critical) || a.slug.localeCompare(b.slug));
console.log(table(sorted));

const fs = require('fs');
const path = require('path');

function main() {
  const frontendDir = path.resolve(__dirname, '..');
  const resultsDir = path.join(frontendDir, 'cypress-results');
  const reportFiles = safeList(resultsDir).filter(f => f.endsWith('.json') && f.includes('cypress-report'));
  const failures = [];
  for (const f of reportFiles) {
    const full = path.join(resultsDir, f);
    const json = readJson(full);
    if (!json) continue;
    for (const r of json.results || []) {
      for (const s of r.suites || []) collectSuite(s, failures);
    }
  }

  const lines = [];
  lines.push('### E2E Failures Summary');
  if (failures.length === 0) {
    lines.push('\nNo test failures detected.');
  } else {
    const grouped = groupBy(failures, 'file');
    for (const [file, items] of Object.entries(grouped)) {
      lines.push(`\n- ${file}`);
      for (const it of items) {
        const tagHints = suggestTags(file, it.title);
        lines.push(`  - ${it.title} — ${it.err || 'failed'}${tagHints ? ` ${tagHints}` : ''}`);
      }
    }
  }

  const out = path.join(frontendDir, 'pr-failures-comment.md');
  fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  console.log('Wrote', out);
}

function collectSuite(suite, failures) {
  for (const t of suite.tests || []) {
    if (t.pass === false) {
      failures.push({
        file: suite.file || suite.title || 'unknown',
        title: t.fullTitle || t.title,
        err: t.err && (t.err.message || t.err.stack || t.err)
      });
    }
  }
  for (const c of suite.suites || []) collectSuite(c, failures);
}

function suggestTags(file, title) {
  const txt = `${file} ${title}`.toLowerCase();
  const tags = [];
  if (txt.includes('login') || txt.includes('auth')) tags.push('@persona:guest', '@trust:auth');
  if (txt.includes('checkout') || txt.includes('payment') || txt.includes('stripe') || txt.includes('paypal')) tags.push('@trust:checkout');
  if (txt.includes('vendor')) tags.push('@persona:vendor');
  if (txt.includes('admin')) tags.push('@persona:admin');
  if (txt.includes('product')) tags.push('@thread:product-browse');
  if (txt.includes('orders')) tags.push('@thread:orders');
  return tags.length ? `(${tags.join(' ')})` : '';
}

function groupBy(arr, key) {
  return arr.reduce((acc, x) => { (acc[x[key]] ||= []).push(x); return acc; }, {});
}

function safeList(dir) { try { return fs.readdirSync(dir); } catch { return []; } }
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

main();

const fs = require('fs');
const path = require('path');

function main() {
  const frontendDir = path.resolve(__dirname, '..');
  const resultsDir = path.join(frontendDir, 'cypress-results');
  const a11ySummary = readJson(path.join(resultsDir, 'a11y-summary.json'));
  const a11yAuthSummary = readJson(path.join(resultsDir, 'a11y-auth-summary.json'));
  const a11yHeaderSummary = readJson(path.join(resultsDir, 'a11y-header-summary.json'));
  const a11yCartSummary = readJson(path.join(resultsDir, 'a11y-cart-summary.json'));
  const a11yHighTrafficSummary = readJson(path.join(resultsDir, 'a11y-high-traffic-summary.json'));
  const a11yProductDetailSummary = readJson(path.join(resultsDir, 'a11y-product-detail-summary.json'));
  const a11yCheckoutSummary = readJson(path.join(resultsDir, 'a11y-checkout-summary.json'));
  const cySummaryTxt = safeRead(path.join(frontendDir, 'cypress-summary.txt'));

  const lines = [];
  lines.push('### Accessibility (a11y) Summary');
  // Aggregate quick totals
  const summaries = [a11ySummary, a11yAuthSummary, a11yHeaderSummary, a11yCartSummary, a11yHighTrafficSummary, a11yProductDetailSummary, a11yCheckoutSummary].filter(Boolean);
  const totals = summaries.reduce((acc, s) => {
    const counts = s?.counts || {};
    for (const n of Object.values(counts)) acc.violations += Number(n || 0);
    acc.routes += Object.keys(counts).length;
    if (s?.meta?.enforced) acc.enforced = true;
    return acc;
  }, { violations: 0, routes: 0, enforced: false });
  if (summaries.length) {
    lines.push('');
    lines.push(`Status: ${totals.violations === 0 ? 'Clean' : `${totals.violations} critical violation${totals.violations===1?'':'s'}`} across ${totals.routes} route${totals.routes===1?'':'s'}${totals.enforced ? ' (enforced)' : ''}.`);
  }
  if (a11ySummary) {
    lines.push('');
    lines.push('Smoke Routes (critical-only):');
    lines.push(renderSummaryCounts(a11ySummary.counts));
  }
  if (a11yAuthSummary) {
    lines.push('');
    lines.push('Auth Pages (critical-only):');
    lines.push(renderSummaryCounts(a11yAuthSummary.counts));
  }
  if (a11yHeaderSummary) {
    lines.push('');
    lines.push('Header & Navigation (critical-only):');
    lines.push(renderSummaryCounts(a11yHeaderSummary.counts));
  }
  if (a11yCartSummary) {
    lines.push('');
    lines.push('Cart (with items) (critical-only):');
    lines.push(renderSummaryCounts(a11yCartSummary.counts));
  }
  if (a11yHighTrafficSummary) {
    lines.push('');
    lines.push('High Traffic (critical-only):');
    lines.push(renderSummaryCounts(a11yHighTrafficSummary.counts));
  }
  if (a11yProductDetailSummary) {
    lines.push('');
    lines.push('Product Detail (critical-only):');
    lines.push(renderSummaryCounts(a11yProductDetailSummary.counts));
  }
  if (a11yCheckoutSummary) {
    lines.push('');
    lines.push('Checkout (critical-only):');
    lines.push(renderSummaryCounts(a11yCheckoutSummary.counts));
  }
  if (cySummaryTxt) {
    lines.push('');
    lines.push('Run Summary:');
    lines.push(cySummaryTxt.trim());
  }

  const out = path.join(frontendDir, 'pr-a11y-comment.md');
  fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  console.log('Wrote', out);
}

function renderSummaryCounts(counts) {
  try {
    const entries = Object.entries(counts || {});
    if (!entries.length) return '- No violations detected or summary missing.';
    return entries.map(([route, n]) => `- ${route}: ${n} violation${n===1?'':'s'}`).join('\n');
  } catch { return '- Summary unavailable'; }
}

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function safeRead(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }

main();

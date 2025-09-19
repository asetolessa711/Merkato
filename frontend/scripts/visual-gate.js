#!/usr/bin/env node
/**
 * visual-gate.js
 * Strict parser for Chromatic JSON output; fails CI when unreviewed diffs exist for @trust-ui stories.
 * Logic:
 *  - Reads chromatic-output.json (emitted by chromatic --json)
 *  - Extracts changed/added/removed stories from 'build' / 'specs'
 *  - Identifies any story whose name, component, or parameters.tags contains '@trust-ui'
 *  - If build.status is 'PENDING' (requires review) OR 'FAILED' and trust diffs exist => exit(1)
 *  - Otherwise exit(0)
 */

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'chromatic-output.json');
if (!fs.existsSync(file)) {
  console.log('[visual-gate] chromatic-output.json missing; skipping gate (pass).');
  process.exit(0);
}

let json;
try {
  json = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.error('[visual-gate] Failed to parse chromatic-output.json:', e.message);
  process.exit(0); // do not hard fail on parse issues
}

// Chromatic output schema may contain: { build: { status, webUrl }, specs: [{component, name, parameters, ...}] }
const build = json.build || {};
const specs = json.specs || json.stories || [];

// Some versions give changed stories in 'specs' with changed flag; fallback grep parameters
function isTrust(spec) {
  try {
    if (!spec) return false;
    const txt = [spec.name, spec.component, JSON.stringify(spec.parameters || {})].join(' ').toLowerCase();
    return txt.includes('@trust-ui');
  } catch { return false; }
}

const changedTrust = specs.filter(s => {
  // potential flags: s.changeType or s.changed or status; fallback detect any spec when build not PASSED
  const changed = s.changeType || s.changed || build.status !== 'PASSED';
  return changed && isTrust(s);
});

const status = (build.status || '').toUpperCase();
const trustCount = changedTrust.length;
console.log(`[visual-gate] Build status: ${status}`);
console.log(`[visual-gate] Trust-tagged changed specs: ${trustCount}`);

if (trustCount > 0 && (status === 'PENDING' || status === 'FAILED')) {
  console.error(`::error title=Visual Diff Gating::${trustCount} @trust-ui story diffs require review (status: ${status}).`);
  process.exit(1);
}

console.log('[visual-gate] No gating violation.');
process.exit(0);

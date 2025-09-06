#!/usr/bin/env node
// Summarize Cypress JSON reporter output into a concise, copy-pastable report.
// Input: frontend/cypress-report.json (created by run-e2e.js)
// Usage: node ./scripts/summarize-cy-report.js

const fs = require('fs');
const path = require('path');

function main() {
  const reportPath = path.resolve(__dirname, '..', 'cypress-report.json');
  if (!fs.existsSync(reportPath)) {
    console.error('[summary] No cypress-report.json found. Run an E2E suite first.');
    process.exit(1);
  }
  const json = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const failures = [];

  const suites = json?.results || json?.suites || json?.tests || [];
  // The JSON reporter used by Cypress (reporter=json) nests under "results" with "suites"/"tests"
  const specs = json?.results || [];

  specs.forEach((spec) => {
    const file = spec?.file || spec?.spec || spec?.fullFile || 'unknown';
    const suites = spec?.suites || [];
    suites.forEach((suite) => {
      const tests = suite?.tests || [];
      tests.forEach((t) => {
        if (t?.fail || t?.state === 'failed') {
          const err = (t?.err && (t.err.message || t.err.stack)) || t?.error || '';
          const firstLine = (err || '').toString().split('\n')[0].slice(0, 280);
          failures.push({ file, title: t?.title?.join(' ') || t?.title || 'unnamed', error: firstLine });
        }
      });
    });
  });

  const stats = json?.stats || {};
  const header = `[summary] ${stats.tests || 0} tests, ${stats.passes || 0} passed, ${stats.failures || failures.length} failed`;
  console.log(header);

  if (failures.length) {
    console.log('[summary] Failing specs & first error line:');
    const lines = [];
    failures.forEach((f) => {
      const line = `- ${f.file} :: ${f.title} :: ${f.error}`;
      console.log(line);
      lines.push(line);
    });
    const outPath = path.resolve(__dirname, '..', 'cypress-failures.txt');
    fs.writeFileSync(outPath, `${header}\n` + lines.join('\n') + '\n', 'utf8');
    console.log(`[summary] Wrote ${failures.length} failure lines to ${outPath}`);
  } else {
    console.log('[summary] No failures detected.');
  }
}

main();


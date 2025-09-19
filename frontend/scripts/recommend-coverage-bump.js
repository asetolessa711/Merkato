#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const compactPath = path.join(__dirname, '..', 'coverage', 'coverage-compact.json');
if (!fs.existsSync(compactPath)) {
  console.error('coverage-compact.json not found. Run npm run test:coverage first.');
  process.exit(1);
}
const cov = JSON.parse(fs.readFileSync(compactPath, 'utf8'));

const floor = (v) => Math.floor(v);
const suggest = (current, buffer = 1) => Math.max(0, floor(current) - buffer);

const lines = suggest(cov.lines);
const branches = suggest(cov.branches);
const functions = suggest(cov.functions);
const statements = suggest(cov.statements);

console.log('Suggested coverageThreshold (global):');
console.log(JSON.stringify({
  global: { lines, branches, functions, statements }
}, null, 2));

console.log('\nNote: This keeps a ~1% buffer under current coverage to avoid flakiness. Raise weekly.');

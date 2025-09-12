#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function loadJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

const summary = loadJson(path.join(__dirname, '..', 'coverage', 'coverage-summary.json'))
  || loadJson(path.join(__dirname, '..', 'coverage', 'coverage-final.json'));

if (!summary) {
  console.log('No coverage summary found. Run test:coverage first.');
  process.exit(0);
}

// Jest writes a top-level total key
const total = summary.total || summary;
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

// Emit a short JSON for workflow consumption
const artifact = path.join(__dirname, '..', 'coverage', 'coverage-compact.json');
fs.writeFileSync(artifact, JSON.stringify(out, null, 2));
console.log('Wrote compact summary to coverage/coverage-compact.json');

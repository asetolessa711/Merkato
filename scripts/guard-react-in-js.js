#!/usr/bin/env node
/**
 * Guard: fail if new staged files under frontend/src contain React/JSX but use .js extension.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function stagedFiles() {
  const out = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim();
  if (!out) return [];
  return out.split(/\r?\n/);
}

function isReactJs(content) {
  if (/from\s+['\"]react['\"]/i.test(content)) return true;
  if (/<[A-Z][A-Za-z0-9]*/.test(content)) return true;
  return false;
}

const root = path.resolve(__dirname, '..');
let violations = 0;
for (const rel of stagedFiles()) {
  if (!rel.startsWith('frontend/src/') || !rel.endsWith('.js')) continue;
  // Allow test files to remain .js
  if (/(__tests__|__mocks__)/.test(rel) || /\.(test|spec)\.js$/i.test(rel)) continue;
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const txt = fs.readFileSync(abs, 'utf8');
  if (isReactJs(txt)) {
    console.error(`❌ React/JSX detected in .js file: ${rel}. Use .jsx (or .tsx) instead.`);
    violations++;
  }
}
if (violations > 0) {
  console.error('\nHint: run "node scripts/rename-react-js-to-jsx.js --apply" to bulk-fix.');
  process.exit(2);
}
console.log('✅ No React-in-.js violations in staged files.');

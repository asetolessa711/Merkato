#!/usr/bin/env node
/**
 * Guard: disallow .js and .jsx twins under frontend/src
 * Exits with non-zero if any twins found.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'frontend', 'src');

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // skip common junk
      if (e.name === 'node_modules' || e.name === '.cache' || e.name === 'dist' || e.name === 'build') continue;
      walk(full, out);
    } else if (e.isFile()) {
      if (full.endsWith('.js') || full.endsWith('.jsx')) out.push(full);
    }
  }
  return out;
}

function findTwins(files) {
  const map = new Map();
  for (const file of files) {
    const ext = path.extname(file);
    const base = path.join(path.dirname(file), path.basename(file, ext));
    if (!map.has(base)) map.set(base, new Set());
    map.get(base).add(ext);
  }
  const twins = [];
  for (const [base, exts] of map) {
    if (exts.has('.js') && exts.has('.jsx')) {
      twins.push({ base, js: base + '.js', jsx: base + '.jsx' });
    }
  }
  return twins;
}

if (!fs.existsSync(SRC)) {
  console.error(`[guard] Missing ${SRC} — nothing to check.`);
  process.exit(0);
}

const files = walk(SRC);
const twins = findTwins(files);
if (twins.length) {
  console.error('\n❌ Found .js/.jsx twin files (keep .jsx canonical and remove .js):');
  for (const t of twins) {
    console.error(`  • ${path.relative(ROOT, t.js)}  ↔  ${path.relative(ROOT, t.jsx)}`);
  }
  console.error('\nRun: npm run fix:imports && npm run rm:js-twins\n');
  process.exit(1);
}
console.log('✅ No .js/.jsx twins detected under frontend/src');

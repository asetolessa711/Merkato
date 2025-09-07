#!/usr/bin/env node
/*
  Guard: prevent committing focused tests (describe.only, it.only, test.only, fit, fdescribe).
  Scans common test locations across the monorepo and fails with a helpful message if found.
*/
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const GLOBS = [
  'frontend/src',
  'frontend/tests',
  'frontend/cypress/e2e',
  'backend/tests',
];

const SKIP_DIR_NAMES = new Set([
  'node_modules', 'coverage', 'build', 'dist', '.git', '__snapshots__', 'fixtures', 'uploads', 'videos', 'screenshots'
]);

const FOCUS_REGEX = /(describe|it|test|context)\.only\s*\(|\b(fit|fdescribe)\b/;
const SKIP_REGEX = /(describe|it|test|context)\.skip\s*\(/;
const TEST_FILE_REGEX = /(__tests__|\.(test|spec)\.(js|jsx|ts|tsx)$)/i;
const CY_FILE_REGEX = /\.cy\.(js|jsx|ts|tsx)$/i;

function walk(dir, files = []) {
  try {
    if (!fs.existsSync(dir)) return files;
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue; // skip unreadable entries (e.g., locked files on Windows)
      }
      if (stat.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry)) continue;
        walk(full, files);
      } else if (/\.(js|jsx|ts|tsx)$/.test(entry)) {
        if (TEST_FILE_REGEX.test(full) || CY_FILE_REGEX.test(full)) {
          files.push(full);
        }
      }
    }
  } catch {
    // Ignore unexpected fs errors and continue
  }
  return files;
}

let focusedHits = [];
let skippedHits = [];

for (const rel of GLOBS) {
  const abs = path.join(ROOT, rel);
  const files = walk(abs);
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8');
    if (FOCUS_REGEX.test(txt)) focusedHits.push(f);
    if (SKIP_REGEX.test(txt)) skippedHits.push(f);
  }
}

if (skippedHits.length) {
  console.warn(`[guard] Warning: found .skip in tests (non-blocking):\n - ${skippedHits.join('\n - ')}`);
}

if (focusedHits.length) {
  console.error('[guard] Focused tests detected. Remove .only/fit/fdescribe before committing:');
  for (const f of focusedHits) console.error(' -', path.relative(ROOT, f));
  process.exit(1);
}

console.log('[guard] OK: no focused tests found.');

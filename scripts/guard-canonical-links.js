#!/usr/bin/env node
/*
Guardrail: prevent raw hardcoded canonical links leaking into active frontend code.
Flags raw occurrences of '/shop', '/c/', or '/deals/' in src (excluding test files and known exceptions).
*/

const fs = require('fs');
const path = require('path');

// Resolve repo root relative to this script so it works from any CWD
const ROOT = path.resolve(__dirname, '..');
const FRONTEND_SRC = path.join(ROOT, 'frontend', 'src');

const PATTERNS = [
  { re: /(^|[^:\w])\/shop(\b|\?|\/)/i, label: "'/shop' legacy path" },
  { re: /(^|[^:\w])\/c\//, label: "raw '/c/' category path" },
  { re: /(^|[^:\w])\/deals\//, label: "raw '/deals/' path" },
];

const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx']);

// Exclude tests, stories, configs, and generated caches
function shouldSkip(file) {
  const p = file.replace(/\\/g, '/');
  if (/__tests__\//.test(p)) return true;
  if (/\.test\.(js|jsx|ts|tsx)$/i.test(p)) return true;
  if (/\.spec\.(js|jsx|ts|tsx)$/i.test(p)) return true;
  if (/\.stories\.(js|jsx|ts|tsx)$/i.test(p)) return true;
  if (/\/config\//.test(p)) return false; // keep config in
  return false;
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, out);
    } else if (EXTS.has(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  if (!fs.existsSync(FRONTEND_SRC)) {
    console.error(`[guard-canonical-links] Missing path: ${FRONTEND_SRC}`);
    process.exit(2);
  }
  const files = walk(FRONTEND_SRC);
  const violations = [];
  for (const file of files) {
    if (shouldSkip(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const { re, label } of PATTERNS) {
      const m = text.match(re);
      if (m) {
        // Allow explicit exceptions inside this guard via @allow-hardcode comment
        if (/@allow-hardcode/.test(text)) continue;
        violations.push({ file, label });
        break;
      }
    }
  }
  if (violations.length) {
    console.error('[guard-canonical-links] Found hardcoded canonical links in source:');
    for (const v of violations) {
      console.error(` - ${v.file}: ${v.label}`);
    }
    console.error('Use LinkBuilder helpers from src/config/routes.js instead.');
    process.exit(1);
  }
  console.log('[guard-canonical-links] OK – no raw canonical links found.');
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e); process.exit(1); }
}

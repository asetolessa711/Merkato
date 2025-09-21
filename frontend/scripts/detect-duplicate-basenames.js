#!/usr/bin/env node
/**
 * Detect files that share the same basename but different extensions (e.g., Navbar.js and Navbar.jsx)
 * under a case-insensitive comparison. This is a common source of Windows collisions.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/** Walk directory recursively */
function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('src/ folder not found');
    process.exit(1);
  }
  const files = walk(SRC);
  const byDir = new Map();
  for (const f of files) {
    const dir = path.dirname(f);
    const list = byDir.get(dir) || [];
    list.push(f);
    byDir.set(dir, list);
  }

  const collisions = [];
  for (const [dir, list] of byDir.entries()) {
    const byBase = new Map();
    for (const f of list) {
      const { name } = path.parse(f);
      const key = name.toLowerCase();
      const arr = byBase.get(key) || [];
      arr.push(f);
      byBase.set(key, arr);
    }
    for (const [key, arr] of byBase.entries()) {
      if (arr.length > 1) {
        const exts = new Set(arr.map((p) => path.extname(p)));
        if (exts.size > 1) {
          collisions.push({ dir, base: key, files: arr });
        }
      }
    }
  }

  if (collisions.length === 0) {
    console.log('✅ No duplicate basenames with differing extensions found under src/.');
    return;
  }

  console.log('⚠️  Potential Windows collisions detected (same basename, different extensions):');
  for (const c of collisions) {
    console.log(`\nDir: ${c.dir}`);
    console.log(`Base: ${c.base}`);
    c.files.forEach((f) => console.log(`  - ${path.relative(SRC, f)} (${path.extname(f)})`));
  }

  console.log('\nSuggested remediation:');
  console.log('- Pick a single canonical extension per component (prefer .jsx for React components).');
  console.log('- Rename or delete the non-canonical files after verifying imports.');
  console.log('- Grep for imports without extensions and ensure they resolve to the intended file.');
  console.log('- Commit in one atomic change to avoid Git stomping on Windows.');
}

main();

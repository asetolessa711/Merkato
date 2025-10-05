#!/usr/bin/env node
/**
 * Rewrite relative import specifiers to be extensionless when they point to .js/.jsx.
 * If both exist, prefer .jsx and remove explicit extension from specifier.
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
      if (e.name === 'node_modules' || e.name === '.cache' || e.name === 'dist' || e.name === 'build') continue;
      walk(full, out);
    } else if (e.isFile()) {
      // Only touch source-like files
      if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(full);
    }
  }
  return out;
}

function has(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function rewriteFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  let changed = false;
  const dir = path.dirname(file);
  const out = src.replace(/(import\s+[^'";]+from\s*|require\()(["'])(\.\.?\/[^"']+)(["']\)?)/g, (m, head, quote, spec, tail) => {
    // Ignore bare specifiers
    if (!spec.startsWith('./') && !spec.startsWith('../')) return m;
    // If spec already has extension other than .js/.jsx, leave as-is
    const ext = path.extname(spec);
    if (ext && ext !== '.js' && ext !== '.jsx') return m;
    let target = path.resolve(dir, spec);
    // If extensionless, check for .jsx or .js
    if (!ext) {
      if (has(target + '.jsx')) {
        changed = true;
        return `${head}${quote}${spec}${quote}${tail.endsWith(')') ? '' : ''}${tail}`; // keep extensionless
      }
      if (has(target + '.js')) {
        changed = true;
        return `${head}${quote}${spec}${quote}${tail.endsWith(')') ? '' : ''}${tail}`;
      }
      return m;
    }
    // If .js or .jsx explicitly, drop the extension
    const without = spec.slice(0, -ext.length);
    const jsxExists = has(path.resolve(dir, without + '.jsx'));
    const jsExists = has(path.resolve(dir, without + '.js'));
    if (jsxExists || jsExists) {
      changed = true;
      return `${head}${quote}${without}${quote}${tail.endsWith(')') ? '' : ''}${tail}`;
    }
    return m;
  });

  if (changed) fs.writeFileSync(file, out, 'utf8');
  return changed;
}

if (!fs.existsSync(SRC)) {
  console.error(`[fix-imports] Missing ${SRC}`);
  process.exit(0);
}

const files = walk(SRC);
let count = 0;
for (const f of files) {
  if (rewriteFile(f)) count++;
}
console.log(`fix-import-extensions: updated ${count} files`);

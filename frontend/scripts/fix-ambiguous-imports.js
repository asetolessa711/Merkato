#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.isFile() && /\.(jsx?|mjs)$/.test(e.name)) out.push(full);
  }
  return out;
}

function fixFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  const importRe = /((import\s+[^'"`]*from\s*)|(require\(\s*))['"]([^'"`]+)['"](\s*\)?)/g;
  let changed = false;
  src = src.replace(importRe, (match, p1, _p2, _p3, spec, p5) => {
    if (!spec.startsWith('.') || path.extname(spec)) return match;
    const base = path.resolve(path.dirname(file), spec);
    const js = `${base}.js`;
    const jsx = `${base}.jsx`;
    const idxJs = path.join(base, 'index.js');
    const idxJsx = path.join(base, 'index.jsx');
    const hasJs = fs.existsSync(js);
    const hasJsx = fs.existsSync(jsx);
    const hasIdxJs = fs.existsSync(idxJs);
    const hasIdxJsx = fs.existsSync(idxJsx);
    const preferIdx = hasIdxJs || hasIdxJsx;
    const rel = (abs) => {
      let p = path.relative(path.dirname(file), abs).replace(/\\/g, '/');
      if (!p.startsWith('.')) p = './' + p;
      return p;
    };
    let replacement = null;
    if (hasJsx && hasJs) {
      replacement = rel(jsx);
    } else if (preferIdx && hasIdxJsx && hasIdxJs) {
      replacement = rel(idxJsx);
    }
    if (replacement) {
      changed = true;
      const out = `${p1}"${replacement}"${p5 || ''}`;
      if (DRY) {
        console.log(`[DRY] ${path.relative(SRC, file)} : ${spec} -> ${replacement}`);
        return match;
      }
      return out;
    }
    return match;
  });
  if (changed && !DRY) {
    fs.writeFileSync(file, src, 'utf8');
    console.log(`✔ Fixed ${path.relative(SRC, file)}`);
  }
}

function main() {
  const files = walk(SRC);
  if (DRY) console.log('Running in DRY mode. No files will be modified.');
  files.forEach((f) => fixFile(f));
  if (DRY) console.log('Dry run complete. Re-run without --dry to apply changes.');
}

main();

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.isFile() && /\.(jsx?|css|json)$/.test(e.name)) out.push(full);
  }
  return out;
}

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function resolveCandidates(fromFile, importPath) {
  if (!importPath.startsWith('.')) return null; // only handle relative
  const base = path.resolve(path.dirname(fromFile), importPath);
  const js = `${base}.js`;
  const jsx = `${base}.jsx`;
  const idxJs = path.join(base, 'index.js');
  const idxJsx = path.join(base, 'index.jsx');
  return { js, jsx, idxJs, idxJsx };
}

function main() {
  const files = walk(SRC).filter((f) => /\.(jsx?|mjs)$/.test(f));
  const importRe = /import\s+[^'"`]*from\s*['"]([^'"`]+)['"];?|require\(\s*['"]([^'"`]+)['"]\s*\)/g;
  let count = 0;
  for (const f of files) {
    const src = read(f);
    if (!src) continue;
    let m;
    while ((m = importRe.exec(src))) {
      const spec = m[1] || m[2];
      if (!spec) continue;
      if (path.extname(spec)) continue; // already explicit
      const c = resolveCandidates(f, spec);
      if (!c) continue;
      const exists = {
        js: fs.existsSync(c.js),
        jsx: fs.existsSync(c.jsx),
        idxJs: fs.existsSync(c.idxJs),
        idxJsx: fs.existsSync(c.idxJsx),
      };
      const hasPair = (exists.js && exists.jsx) || (exists.idxJs && exists.idxJsx);
      if (hasPair) {
        if (count === 0) {
          console.log('⚠️  Ambiguous imports found (both .js and .jsx exist):');
        }
        count++;
        console.log(`\nFile: ${path.relative(SRC, f)}`);
        console.log(`  Import: ${spec}`);
        if (exists.js && exists.jsx) {
          console.log(`  Candidates: ${path.relative(SRC, c.js)} and ${path.relative(SRC, c.jsx)}`);
        }
        if (exists.idxJs && exists.idxJsx) {
          console.log(`  Candidates: ${path.relative(SRC, c.idxJs)} and ${path.relative(SRC, c.idxJsx)}`);
        }
      }
    }
  }
  if (count === 0) console.log('✅ No ambiguous imports found.');
}

main();

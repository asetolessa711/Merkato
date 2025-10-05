#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'frontend', 'src');

const APPLY = process.argv.includes('--apply') || process.env.APPLY === '1';
const DRY = !APPLY;

function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
}

function isLikelyReactJsx(content) {
  if (/from\s+['\"]react['\"]/i.test(content) || /import\s+React/i.test(content)) return true;
  // quick JSX heuristic: a tag-like token with capital letter
  if (/<[A-Z][A-Za-z0-9]*/.test(content)) return true;
  return false;
}

function replaceAllImportsInFile(filePath, renameMap) {
  let text = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [oldRel, newRel] of renameMap) {
    // Replace both with extension and extensionless variants
    const patterns = [
      new RegExp(`(from\s+['\"])${oldRel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(["\'])`, 'g'),
      new RegExp(`(require\(\s*['\"])${oldRel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(["\']\s*\))`, 'g'),
    ];
    for (const re of patterns) {
      if (re.test(text)) {
        text = text.replace(re, `$1${newRel}$2`);
        changed = true;
      }
    }
  }
  if (changed) fs.writeFileSync(filePath, text, 'utf8');
  return changed;
}

// 1) Find .js files that likely contain JSX
const files = [];
walk(SRC, files);
const jsFiles = files.filter(f => f.endsWith('.js'));
const candidates = [];
for (const f of jsFiles) {
  const base = path.basename(f);
  if (base.endsWith('.test.js') || base.endsWith('.spec.js')) continue;
  const txt = fs.readFileSync(f, 'utf8');
  if (isLikelyReactJsx(txt)) {
    const twin = f.replace(/\.js$/, '.jsx');
    if (fs.existsSync(twin)) {
      // skip if twin already exists; this is a true twin
      continue;
    }
    candidates.push({ js: f, jsx: twin });
  }
}

if (candidates.length === 0) {
  console.log('No .js React component files detected that need .jsx renaming.');
  process.exit(0);
}

console.log('Candidates to rename (.js -> .jsx):');
for (const c of candidates) {
  console.log(' - ' + path.relative(ROOT, c.js).replace(/\\/g,'/'));
}

if (DRY) {
  console.error(`DRY-RUN: ${candidates.length} files would be renamed. Pass --apply or set APPLY=1 to perform changes.`);
  process.exit(0);
}

// 2) git mv each .js -> .jsx using safe two-step on case-insensitive FS
for (const c of candidates) {
  const tmp = c.js + '.tmp_ren';
  execSync(`git mv "${path.relative(ROOT, c.js)}" "${path.relative(ROOT, tmp)}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`git mv "${path.relative(ROOT, tmp)}" "${path.relative(ROOT, c.jsx)}"`, { cwd: ROOT, stdio: 'inherit' });
}

// 3) Update imports throughout frontend and tests
const renameMap = new Map();
for (const c of candidates) {
  const oldRel = './' + path.relative(path.dirname(c.jsx), c.js).replace(/\\/g,'/');
  let newRel = './' + path.relative(path.dirname(c.jsx), c.jsx).replace(/\\/g,'/');
  // Prefer extensionless
  newRel = newRel.replace(/\.jsx$/,'');
  renameMap.set(oldRel, newRel);
  // Also support paths without leading ./ in some imports
  const oldNoDot = oldRel.replace(/^\.\//,'');
  const newNoDot = newRel.replace(/^\.\//,'');
  renameMap.set(oldNoDot, newNoDot);
}

const projFiles = [];
walk(ROOT, projFiles);
const srcTextFiles = projFiles.filter(f => /\.(js|jsx|ts|tsx|json|md|css|scss|less|yml|yaml|graphql|gql)$/.test(f));
let changedCount = 0;
for (const f of srcTextFiles) {
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) continue;
  if (replaceAllImportsInFile(f, renameMap)) changedCount++;
}
console.log(`Updated imports in ${changedCount} files.`);

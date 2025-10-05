#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'frontend', 'src');

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
}

const files = [];
walk(root, files);
const jsx = new Set(files.filter(f => f.endsWith('.jsx')));
const pairs = [];
for (const f of jsx) {
  const js = f.slice(0, -1); // replace .jsx -> .js
  if (fs.existsSync(js)) {
    pairs.push({ jsx: f, js });
  }
}

for (const p of pairs) {
  const relJsx = path.relative(path.resolve(__dirname, '..'), p.jsx).replace(/\\/g,'/');
  const relJs = path.relative(path.resolve(__dirname, '..'), p.js).replace(/\\/g,'/');
  console.log(`${relJsx} | ${relJs}`);
}
console.error(`PAIRS=${pairs.length}`);

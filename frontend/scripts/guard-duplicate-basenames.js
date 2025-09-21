#!/usr/bin/env node
const path = require('path');
const { spawnSync } = require('child_process');

const script = path.resolve(__dirname, 'detect-duplicate-basenames.js');
const res = spawnSync(process.execPath, [script], { stdio: 'inherit' });
// If the detector printed collisions, exit code is still 0.
// We re-run and capture stdout to decide failure if collisions header appears.
const capture = spawnSync(process.execPath, [script], { encoding: 'utf8' });
if (capture.stdout.includes('Potential Windows collisions detected')) {
  console.error('\n❌ Duplicate basenames detected. Please resolve before committing.');
  process.exit(2);
}
console.log('✅ No duplicate basenames detected.');

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname,'..','chromatic-output.json');
let summary = ['## Chromatic Visual Summary'];
if(!fs.existsSync(file)) { summary.push('No chromatic-output.json found.'); }
else {
  try {
    const raw = fs.readFileSync(file,'utf8');
    const status = (raw.match(/"status":"(.*?)"/)||[])[1] || 'unknown';
    const trust = (raw.match(/@trust-ui/g)||[]).length;
    summary.push(`Status: ${status}`);
    summary.push(`@trust-ui tag occurrences (story/meta scan): ${trust}`);
  } catch(e) { summary.push('Failed to parse output: '+e.message); }
}
fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY || 'chromatic-summary.md', summary.join('\n'));
console.log(summary.join('\n'));

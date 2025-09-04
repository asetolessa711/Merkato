const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const input = path.join(root, 'jest-results-latest.json');
const output = path.join(root, 'jest-failures-summary.txt');

if (!fs.existsSync(input)) {
  console.error('No jest-results-latest.json found at', input);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(input, 'utf8') || '{}');
const out = [];

out.push(`Suites: total=${data.numTotalTestSuites} passed=${data.numPassedTestSuites} failed=${data.numFailedTestSuites}`);
out.push(`Tests: total=${data.numTotalTests} passed=${data.numPassedTests} failed=${data.numFailedTests}`);

for (const suite of data.testResults || []) {
  const failed = (suite.assertionResults || []).filter(a => a.status === 'failed');
  if (failed.length) {
    out.push(`\nSuite: ${suite.name}`);
    for (const a of failed) {
      out.push(`  - ${a.fullName || a.title}`);
      if (a.failureMessages && a.failureMessages.length) {
        const msg = a.failureMessages.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
        out.push('    ' + msg.split('\n').slice(0, 6).join('\n    '));
      }
    }
  }
}

fs.writeFileSync(output, out.join('\n'));
console.log('Wrote failure summary to', output);

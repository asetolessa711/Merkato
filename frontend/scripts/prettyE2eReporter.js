const fs = require('fs');
const path = require('path');

function startProgressSpinner(label) {
  const isTTY = Boolean(process.stdout && process.stdout.isTTY);
  const disabled = String(process.env.E2E_NO_SPINNER || '').toLowerCase() === 'true';
  const isCI = String(process.env.CI || '').toLowerCase() === 'true';
  const enabled = isTTY && !disabled && !isCI;

  if (!enabled) {
    if (label) process.stdout.write(`${label}\n`);
    return null;
  }

  const frames = ['|', '/', '-', '\\'];
  let i = 0;
  const timer = setInterval(() => {
    const frame = frames[i % frames.length];
    i += 1;
    process.stdout.write(`\r${frame} ${label}   `);
  }, 90);

  return { timer };
}

function stopProgressSpinner(handle, finalLine = '') {
  if (!handle || !handle.timer) {
    if (finalLine) process.stdout.write(`${finalLine}\n`);
    return;
  }

  clearInterval(handle.timer);
  process.stdout.write('\r\x1b[2K');
  if (finalLine) process.stdout.write(`${finalLine}\n`);
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function resolveState(test) {
  if (!test || typeof test !== 'object') return 'unknown';
  if (test.state) return test.state;
  if (test.fail || test.failed) return 'failed';
  if (test.pending || test.skipped) return 'pending';
  if (test.pass || test.passed) return 'passed';
  return 'unknown';
}

function firstFailureLine(test) {
  const err = test && test.err ? test.err : null;
  if (!err) return '';

  const raw = err.message || err.stack || err.estack || '';
  if (!raw) return '';

  const lines = String(raw)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[0] || '';
}

function collectTests(node, ancestors = [], out = []) {
  if (!node || typeof node !== 'object') return out;

  const nextAncestors = node.title ? [...ancestors, node.title] : ancestors;
  const tests = Array.isArray(node.tests) ? node.tests : [];
  const suites = Array.isArray(node.suites) ? node.suites : [];

  tests.forEach((t) => {
    const fallbackTitle = [...nextAncestors, t.title].filter(Boolean).join(' > ');
    out.push({
      title: t.fullTitle || fallbackTitle || t.title || '(unnamed test)',
      state: resolveState(t),
      duration: typeof t.duration === 'number' ? t.duration : 0,
      failure: firstFailureLine(t),
    });
  });

  suites.forEach((s) => collectTests(s, nextAncestors, out));
  return out;
}

function renderPrettyCypressResults(resultsDir, { prefix = '[e2e]', mode = '' } = {}) {
  const modeRaw = String(mode || process.env.E2E_PRETTY_MODE || process.env.PRETTY_REPORTER_MODE || '').toLowerCase();
  const compactFlag = String(process.env.E2E_PRETTY_COMPACT || '').toLowerCase() === 'true';
  const compactMode = modeRaw === 'compact' || compactFlag;

  let files = [];
  try {
    files = fs
      .readdirSync(resultsDir)
      .filter((name) => /\.json$/i.test(name))
      .sort();
  } catch (_) {
    return null;
  }

  if (!files.length) return null;

  const specs = [];

  files.forEach((name) => {
    const filePath = path.join(resultsDir, name);
    const report = readJsonSafe(filePath);
    if (!report) return;

    const results = Array.isArray(report.results) ? report.results : [];
    results.forEach((result) => {
      const tests = collectTests(result, []);
      if (!tests.length) return;

      const specPath = result.fullFile || result.file || name;
      specs.push({
        specPath,
        tests,
        duration: tests.reduce((sum, test) => sum + (test.duration || 0), 0),
      });
    });
  });

  if (!specs.length) return null;

  specs.sort((a, b) => a.specPath.localeCompare(b.specPath));

  let printedTestIndex = 0;
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalPending = 0;
  let totalDuration = 0;

  process.stdout.write(`\n${prefix} ${compactMode ? 'Compact' : 'Detailed'} spec results:\n`);

  specs.forEach((spec, i) => {
    const specFailed = spec.tests.some((test) => test.state === 'failed');
    const visibleTests = compactMode ? spec.tests.filter((test) => test.state === 'failed') : spec.tests;
    if (compactMode && !visibleTests.length) {
      // In compact mode, skip clean specs to reduce noise.
      totalDuration += spec.duration;
      spec.tests.forEach((test) => {
        totalTests += 1;
        if (test.state === 'passed') totalPassed += 1;
        else if (test.state === 'failed') totalFailed += 1;
        else totalPending += 1;
      });
      return;
    }

    const specSymbol = specFailed ? '✘' : '✔';
    process.stdout.write(`${specSymbol} [${i + 1}/${specs.length}] ${spec.specPath} (${spec.duration}ms)\n`);

    totalDuration += spec.duration;

    spec.tests.forEach((test) => {
      totalTests += 1;

      let symbol = '-';
      if (test.state === 'passed') {
        symbol = '✔';
        totalPassed += 1;
      } else if (test.state === 'failed') {
        symbol = '✘';
        totalFailed += 1;
      } else {
        totalPending += 1;
      }

      if (!compactMode || test.state === 'failed') {
        printedTestIndex += 1;
        process.stdout.write(`  ${String(printedTestIndex).padStart(3, ' ')}. ${symbol} ${test.title}\n`);
        if (test.state === 'failed' && test.failure) {
          process.stdout.write(`       -> ${test.failure}\n`);
        }
      }
    });
  });

  if (compactMode && totalFailed === 0) {
    process.stdout.write(`${prefix} ✔ No failing tests in compact mode.\n`);
  }

  process.stdout.write(
    `${prefix} Pretty summary: ${totalTests} tests, ${totalPassed} passed, ${totalFailed} failed, ${totalPending} pending (${totalDuration}ms)\n\n`
  );

  return {
    specs: specs.length,
    tests: totalTests,
    passes: totalPassed,
    failures: totalFailed,
    pending: totalPending,
    duration: totalDuration,
  };
}

module.exports = {
  startProgressSpinner,
  stopProgressSpinner,
  renderPrettyCypressResults,
};
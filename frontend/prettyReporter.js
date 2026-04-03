const path = require('path');

class PrettyReporter {
  constructor() {
    this.suiteIndex = 0;
    this.testIndex = 0;
    this.totalSuites = 0;

    this.spinnerTimer = null;
    this.spinnerFrame = 0;
    this.spinnerFrames = ['|', '/', '-', '\\'];

    this.currentFile = null;
    this.completedFiles = new Set();
    this.isTTY = Boolean(process.stdout && process.stdout.isTTY);
    this.spinnerEnabled =
      this.isTTY && String(process.env.PRETTY_REPORTER_NO_SPINNER || '').toLowerCase() !== 'true';
    const modeRaw = String(process.env.PRETTY_REPORTER_MODE || '').toLowerCase();
    const compactFlag = String(process.env.PRETTY_REPORTER_COMPACT || '').toLowerCase() === 'true';
    this.compactMode = modeRaw === 'compact' || compactFlag;
  }

  onRunStart(aggregatedResults) {
    this.totalSuites = aggregatedResults.numTotalTestSuites || 0;
    this.print('');
    this.print(`Test run started: ${this.totalSuites} file(s)`);
    this.print(`Output mode: ${this.compactMode ? 'compact' : 'detailed'}`);
  }

  onTestStart(test) {
    this.handleSuiteStart(test);
  }

  onTestFileStart(test) {
    this.handleSuiteStart(test);
  }

  onTestResult(test, testResult) {
    this.handleSuiteResult(test, testResult);
  }

  onTestFileResult(test, testResult) {
    this.handleSuiteResult(test, testResult);
  }

  onRunComplete(_, aggregatedResults) {
    this.stopSpinner();

    const failedSuites = aggregatedResults.numFailedTestSuites || 0;
    const passedSuites = aggregatedResults.numPassedTestSuites || 0;
    const totalSuites = aggregatedResults.numTotalTestSuites || 0;

    const failedTests = aggregatedResults.numFailedTests || 0;
    const passedTests = aggregatedResults.numPassedTests || 0;
    const pendingTests = (aggregatedResults.numPendingTests || 0) + (aggregatedResults.numTodoTests || 0);
    const totalTests = aggregatedResults.numTotalTests || 0;

    const elapsedMs = aggregatedResults.startTime ? Date.now() - aggregatedResults.startTime : 0;

    this.print('');
    this.print('Run Summary');
    this.print(`  Files: ${passedSuites} passed, ${failedSuites} failed, ${totalSuites} total`);
    this.print(`  Tests: ${passedTests} passed, ${failedTests} failed, ${pendingTests} pending/todo, ${totalTests} total`);
    this.print(`  Time:  ${(elapsedMs / 1000).toFixed(2)}s`);
    this.print('');
  }

  handleSuiteStart(test) {
    const testPath = this.resolvePath(test);
    if (!testPath || testPath === this.currentFile) return;

    this.suiteIndex += 1;
    this.currentFile = testPath;
    this.startSpinner();
  }

  handleSuiteResult(test, testResult) {
    const testPath = this.resolvePath(test, testResult);
    if (!testPath || this.completedFiles.has(testPath)) return;
    this.completedFiles.add(testPath);

    this.stopSpinner();

    const relativePath = path.relative(process.cwd(), testPath);
    const suiteFailed = (testResult.numFailingTests || 0) > 0 || Boolean(testResult.testExecError);
    const suiteSymbol = suiteFailed ? '✘' : '✔';
    const runtimeMs =
      testResult && testResult.perfStats && typeof testResult.perfStats.runtime === 'number'
        ? testResult.perfStats.runtime
        : 0;

    this.print(`${suiteSymbol} [${this.suiteIndex}/${this.totalSuites || '?'}] ${relativePath} (${runtimeMs}ms)`);

    const assertions = Array.isArray(testResult.testResults) ? testResult.testResults : [];

    if (this.compactMode) {
      const failedAssertions = assertions.filter((assertion) => assertion.status === 'failed');

      if (failedAssertions.length === 0) {
        const passedCount = assertions.filter((assertion) => assertion.status === 'passed').length;
        const pendingCount = assertions.filter((assertion) => assertion.status !== 'passed').length;
        this.print(`      ${passedCount} passed${pendingCount ? `, ${pendingCount} pending/todo` : ''}`);
      } else {
        failedAssertions.forEach((assertion) => {
          this.testIndex += 1;
          const fullTitle = this.composeFullTitle(assertion);
          this.print(`  ${String(this.testIndex).padStart(3, ' ')}. ✘ ${fullTitle}`);

          if (Array.isArray(assertion.failureMessages) && assertion.failureMessages.length > 0) {
            const shortReason = this.pickFailureHeadline(assertion.failureMessages[0]);
            if (shortReason) {
              this.print(`       -> ${shortReason}`);
            }
          }
        });
      }

      this.currentFile = null;
      return;
    }

    assertions.forEach((assertion) => {
      this.testIndex += 1;
      const testSymbol = assertion.status === 'passed' ? '✔' : assertion.status === 'failed' ? '✘' : '-';
      const fullTitle = this.composeFullTitle(assertion);
      this.print(`  ${String(this.testIndex).padStart(3, ' ')}. ${testSymbol} ${fullTitle}`);

      if (assertion.status === 'failed' && Array.isArray(assertion.failureMessages) && assertion.failureMessages.length > 0) {
        const shortReason = this.pickFailureHeadline(assertion.failureMessages[0]);
        if (shortReason) {
          this.print(`       -> ${shortReason}`);
        }
      }
    });

    this.currentFile = null;
  }

  composeFullTitle(assertion) {
    const ancestors = Array.isArray(assertion.ancestorTitles) ? assertion.ancestorTitles : [];
    const title = assertion.title || '(unnamed test)';
    return ancestors.length > 0 ? `${ancestors.join(' > ')} > ${title}` : title;
  }

  pickFailureHeadline(message) {
    if (!message) return '';
    const lines = String(message)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return '';

    const preferred = lines.find((line) => /expect\(|Expected:|Received:|Error|TypeError|ReferenceError/.test(line));
    return preferred || lines[0];
  }

  resolvePath(test, testResult) {
    return (test && test.path) || (testResult && testResult.testFilePath) || null;
  }

  startSpinner() {
    if (!this.currentFile) return;
    const relativePath = path.relative(process.cwd(), this.currentFile);
    const label = `[${this.suiteIndex}/${this.totalSuites || '?'}] ${relativePath}`;

    if (!this.spinnerEnabled) {
      this.print(`... Running ${label}`);
      return;
    }

    this.stopSpinner();
    this.spinnerTimer = setInterval(() => {
      const frame = this.spinnerFrames[this.spinnerFrame % this.spinnerFrames.length];
      this.spinnerFrame += 1;
      process.stdout.write(`\r${frame} Running ${label}   `);
    }, 90);
  }

  stopSpinner() {
    if (this.spinnerTimer) {
      clearInterval(this.spinnerTimer);
      this.spinnerTimer = null;
    }

    if (this.isTTY) {
      process.stdout.write('\r\x1b[2K');
    }
  }

  print(message) {
    process.stdout.write(`${message}\n`);
  }
}

module.exports = PrettyReporter;
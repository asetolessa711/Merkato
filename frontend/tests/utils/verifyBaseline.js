/**
 * Verify that all previously passing frontend tests still pass.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..', '..');
const outputFile = path.join(frontendRoot, 'jest-results-frontend-verify.json');
const baselineFile = path.join(frontendRoot, 'tests', 'utils', 'baseline-passing.json');

if (!fs.existsSync(baselineFile)) {
	console.error('[frontend baseline] Missing baseline file:', baselineFile);
	process.exit(1);
}

function runJestJson() {
	console.log('[frontend baseline] Running Craco/Jest for verification...');
	const cracoJs = path.join(frontendRoot, 'node_modules', '@craco', 'craco', 'bin', 'craco.js');
	const args = ['test', '--env=jsdom', '--watchAll=false', '--runInBand', '--json', `--outputFile=${outputFile}`];
	let res;
	if (fs.existsSync(cracoJs)) {
		res = spawnSync(process.execPath, [cracoJs, ...args], {
			cwd: frontendRoot,
			env: { ...process.env, CI: 'true' },
			stdio: 'inherit',
			shell: false,
		});
	} else {
		const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
		res = spawnSync(npxCmd, ['craco', ...args], {
			cwd: frontendRoot,
			env: { ...process.env, CI: 'true' },
			stdio: 'inherit',
			shell: false,
		});
	}
	if (res.error) {
		console.error('[frontend baseline] Failed to run craco test:', res.error.message);
		process.exit(1);
	}
}

function extractPassingTestNames(resultJson) {
	const names = [];
	for (const suite of resultJson.testResults || []) {
		for (const assertion of suite.assertionResults || []) {
			if (assertion.status === 'passed') {
				const fullName = assertion.fullName || assertion.title;
				if (fullName) names.push(fullName);
			}
		}
	}
	return names.sort();
}

function main() {
	const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
	runJestJson();
	if (!fs.existsSync(outputFile)) {
		console.error('[frontend baseline] Missing verification JSON:', outputFile);
		process.exit(1);
	}
	const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
	const passingNow = new Set(extractPassingTestNames(data));
	const missing = [];
	for (const name of baseline.tests) {
		if (!passingNow.has(name)) missing.push(name);
	}
	if (missing.length) {
		console.error(`\n[frontend baseline] REGRESSION: ${missing.length} previously passing tests failed or didn't run.`);
		console.error('Examples (up to 20):');
		for (const m of missing.slice(0, 20)) console.error('  -', m);
		process.exit(1);
	}
	console.log(`[frontend baseline] OK — All ${baseline.count} baseline-passing tests still pass.`);
}

main();

/**
 * Record the current set of passing frontend tests into a baseline file.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..', '..');
const outputFile = path.join(frontendRoot, 'jest-results-frontend.json');
const baselineFile = path.join(frontendRoot, 'tests', 'utils', 'baseline-passing.json');

function runJestJson() {
	console.log('[frontend baseline] Running Craco/Jest to capture JSON results...');
	// Prefer running via Craco to ensure Jest config matches npm test
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
	runJestJson();
	if (!fs.existsSync(outputFile)) {
		console.error('[frontend baseline] Jest output JSON not found:', outputFile);
		process.exit(1);
	}
	const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
	const passing = extractPassingTestNames(data);
	console.log(`[frontend baseline] Captured ${passing.length} passing tests. Writing baseline...`);
	fs.writeFileSync(
		baselineFile,
		JSON.stringify({ recordedAt: new Date().toISOString(), count: passing.length, tests: passing }, null, 2)
	);
	console.log('[frontend baseline] Baseline written to', baselineFile);
}

main();

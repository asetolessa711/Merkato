const path = require('path');
const baseConfig = require('./jest.config.backend.js');

const prettyReporterPath = path.resolve(__dirname, './prettyReporter.js');
const reporters = Array.isArray(baseConfig.reporters) ? [...baseConfig.reporters] : [];

if (!reporters.includes(prettyReporterPath)) {
	reporters.push(prettyReporterPath);
}

module.exports = {
	...baseConfig,
	reporters,
};

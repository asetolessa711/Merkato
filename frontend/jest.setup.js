// Add custom jest setup for frontend tests
import '@testing-library/jest-dom';

// Guard against accidentally committed focused tests in CI runtime
beforeAll(() => {
	const stack = new Error().stack || '';
	if (process.env.CI && /(describe|it|test)\.only/.test(stack)) {
		throw new Error('Focused test detected at runtime');
	}
});

// Quiet a few noisy warnings in CI/pre-push without hiding errors
const originalError = console.error;
const originalWarn = console.warn;
const shouldFilter = Boolean(process.env.CI || process.env.PRE_PUSH);

if (shouldFilter) {
	console.error = (...args) => {
		const msg = String(args[0] ?? '');
		// React act(...) warnings from JSDOM + Suspense
		if (msg.includes('Warning: An update to') && msg.includes('not wrapped in act')) return;
		// DefaultProps deprecation warning from React Router or libraries
		if (msg.includes('Warning: defaultProps will be removed')) return;
		return originalError.apply(console, args);
	};
	console.warn = (...args) => {
		const msg = String(args[0] ?? '');
		// ESLint loader / webpack deprecation chatter during test runs
		if (msg.includes('ESLint') && msg.includes('loader')) return;
		if (msg.includes('You should not use <Switch> outside a <Router>')) return;
		return originalWarn.apply(console, args);
	};
}

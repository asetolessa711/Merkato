import '@testing-library/jest-dom';
// Ensure CRA/Jest uses our manual axios mock for all tests
jest.mock('axios');
import axios from 'axios';

// Quiet known noisy warnings/errors in tests to keep CI output readable.
// We only suppress very specific, non-actionable messages from dependencies.
(() => {
	const originalWarn = console.warn;
	const originalError = console.error;
	// Silence verbose logs in tests; keep warnings/errors (filtered below) visible for actionable issues.
	// eslint-disable-next-line no-console
	console.log = () => {};
	// eslint-disable-next-line no-console
	console.info = () => {};
	// eslint-disable-next-line no-console
	console.debug = () => {};

	const WARN_SUPPRESS_PATTERNS = [
		// React Router v6 deprecation/future flags noise
		'React Router Future Flag Warning',
		'v7_startTransition',
		'v7_relativeSplatPath',
	];

	const ERROR_SUPPRESS_PATTERNS = [
		// jsdom limitation triggered by <a> navigation timers in tests
		'Not implemented: navigation (except hash changes)',
		// jsdom limitation for scrollTo
		'Not implemented: window.scrollTo',
		// React Testing Library act() advisory for async state in mounted components
		'inside a test was not wrapped in act',
	];

	console.warn = (...args) => {
		try {
			const msg = args && args[0] ? String(args[0]) : '';
			if (WARN_SUPPRESS_PATTERNS.some((p) => msg.includes(p))) return;
		} catch (_) {}
		return originalWarn.apply(console, args);
	};

	console.error = (...args) => {
		try {
			const msg = args && args[0] ? String(args[0]) : '';
			if (ERROR_SUPPRESS_PATTERNS.some((p) => msg.includes(p))) return;
		} catch (_) {}
		return originalError.apply(console, args);
	};
})();

// jsdom shims for browser APIs often used in our components
if (typeof window !== 'undefined') {
	// Always stub scrollTo: jsdom's implementation throws by default and is noisy in tests
	// eslint-disable-next-line no-undef
	window.scrollTo = jest.fn();
	if (!window.matchMedia) {
		window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
	}
}

// Provide safe defaults; tests can override per-case by re-mocking implementations
beforeEach(() => {
	if (!axios) return;

	const ensureMockFn = (key) => {
		if (!axios[key] || typeof axios[key] !== 'function' || !('mockReset' in axios[key])) {
			// define as a jest.fn if missing or not a mock
			axios[key] = jest.fn();
		}
	};

	['get', 'post', 'put', 'patch', 'delete'].forEach(ensureMockFn);

	// Only provide defaults if no test-specific implementation exists
	if (typeof axios.get.getMockImplementation === 'function' && !axios.get.getMockImplementation()) {
		axios.get.mockImplementation((url) => {
			if (url === '/api/auth/me') return Promise.resolve({ data: {} });
			if (url === '/api/products') return Promise.resolve({ data: [] });
			return Promise.resolve({ data: {} });
		});
	}
	if (typeof axios.post.getMockImplementation === 'function' && !axios.post.getMockImplementation()) {
		axios.post.mockImplementation(() => Promise.resolve({ data: {} }));
	}
	if (typeof axios.put.getMockImplementation === 'function' && !axios.put.getMockImplementation()) {
		axios.put.mockImplementation(() => Promise.resolve({ data: {} }));
	}
	if (typeof axios.patch.getMockImplementation === 'function' && !axios.patch.getMockImplementation()) {
		axios.patch.mockImplementation(() => Promise.resolve({ data: {} }));
	}
	if (typeof axios.delete.getMockImplementation === 'function' && !axios.delete.getMockImplementation()) {
		axios.delete.mockImplementation(() => Promise.resolve({ data: {} }));
	}
});

import '@testing-library/jest-dom';

// Quiet known noisy warnings/errors in tests to keep CI output readable.
// We only suppress very specific, non-actionable messages from dependencies.
(() => {
	const originalWarn = console.warn;
	const originalError = console.error;

	const WARN_SUPPRESS_PATTERNS = [
		// React Router v6 deprecation/future flags noise
		'React Router Future Flag Warning',
		'v7_startTransition',
		'v7_relativeSplatPath',
	];

	const ERROR_SUPPRESS_PATTERNS = [
		// jsdom limitation triggered by <a> navigation timers in tests
		'Not implemented: navigation (except hash changes)',
		// jsdom limitation for scrollTo in the test environment
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

// jsdom's window.scrollTo throws Not Implemented; always mock to a no-op in tests
if (typeof window !== 'undefined') {
	// Prefer a jest mock when available for call assertions
	// eslint-disable-next-line no-undef
	window.scrollTo = typeof jest !== 'undefined' ? jest.fn() : () => {};
}

// Add custom jest setup for frontend tests
import '@testing-library/jest-dom';
// Guard against accidentally committed focused tests in CI runtime
beforeAll(() => {
	const stack = new Error().stack || '';
	if (/(describe|it|test)\.only/.test(stack)) {
		throw new Error('Focused test detected at runtime');
	}
});

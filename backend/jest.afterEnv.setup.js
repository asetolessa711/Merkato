// Jest afterEnv: mock nodemailer so tests don't require real SMTP credentials.
try {
	jest.setTimeout?.(30000);
	// Configure sharp for tests to reduce flakiness and open handles
	try {
		const sharp = require('sharp');
		if (sharp && typeof sharp.cache === 'function') sharp.cache(false);
		if (sharp && typeof sharp.concurrency === 'function') sharp.concurrency(1);
	} catch (_) {
		// sharp not required in some tests; ignore
	}
	jest.mock('nodemailer', () => {
		const sendMailMock = jest.fn(async () => ({
			accepted: ['test@example.com'],
			rejected: [],
			response: '250 OK (mock)'
		}));
		return {
			__esModule: true,
			default: { createTransport: jest.fn(() => ({
				verify: jest.fn(async () => true),
				sendMail: sendMailMock,
			})) },
			createTransport: jest.fn(() => ({
				verify: jest.fn(async () => true),
				sendMail: sendMailMock,
			})),
		};
	});

	// Light mock for puppeteer to avoid spawning Chromium in tests (especially under --detectOpenHandles)
	jest.mock('puppeteer', () => {
		return {
			__esModule: true,
			launch: jest.fn(async () => ({
				newPage: async () => ({
					setContent: async () => {},
					pdf: async () => Buffer.from('%PDF-1.4 test'),
					close: async () => {},
				}),
				close: async () => {},
			})),
		};
	});
	// Reduce noisy console.error during email code paths in tests
	const originalError = console.error;
	console.error = (...args) => {
		if (typeof args[0] === 'string' && args[0].includes('Email send failed')) {
			return; // suppress expected mock error logs
		}
		return originalError.apply(console, args);
	};
} catch (_) {
	// no-op if jest.mock not available yet
}

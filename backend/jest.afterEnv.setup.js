// Jest afterEnv: mock nodemailer so tests don't require real SMTP credentials.
try {
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

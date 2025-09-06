const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
	// In development (including Cypress semi-attach), proxy API calls to the backend dev server.
	// Prefer REACT_APP_API_URL when provided, otherwise default to local backend on 5000.
	const target = process.env.REACT_APP_API_URL || 'http://localhost:5000';
	app.use('/api', createProxyMiddleware({
		target,
		changeOrigin: true,
		// Do not require SSL and preserve host header for local dev
		secure: false,
	}));
};


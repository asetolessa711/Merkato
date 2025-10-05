const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
	// In development, proxy only API calls to the backend dev server.
	// Prefer REACT_APP_API_URL when provided, otherwise default to local backend on 5000.
	const target = process.env.REACT_APP_API_URL || 'http://localhost:5000';
	app.use(
		'/api',
		createProxyMiddleware({
			target,
			changeOrigin: true,
			secure: false,
			logLevel: 'warn',
			onError(err, req, res) {
				try {
					// Emit a single-line dev-friendly notice instead of noisy stack traces
					console.warn(`[dev-proxy] Backend ${target} unavailable for ${req.method} ${req.url} (${err.code || 'error'})`);
					res.writeHead(502, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'backend_unavailable', target, path: req.url }));
				} catch (_) {
					// Fallback
					res.end();
				}
			},
		})
	);
};


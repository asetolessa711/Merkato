const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
	const target = process.env.REACT_APP_API_URL;
	if (target) {
		app.use('/api', createProxyMiddleware({
			target,
			changeOrigin: true,
		}));
	}
};


const webpack = require('webpack');
const path = require('path');

module.exports = {
  // Disable ESLint integration in CRACO to avoid eslint-loader expectation on CRA 5
  eslint: {
    enable: false,
  },
  jest: {
    configure: (jestConfig) => {
      const fs = require('fs');
      const hasExtraTestsDir = fs.existsSync(require('path').resolve(__dirname, 'tests'));
      jestConfig.roots = [
        '<rootDir>/src',
        ...(hasExtraTestsDir ? ['<rootDir>/tests'] : [])
      ];
      // Prefer .jsx over .js to avoid basename collisions selecting the wrong file
      jestConfig.moduleFileExtensions = ['jsx', 'js', 'json', 'node'];
      return jestConfig;
    }
  },
  webpack: {
    alias: {
      process: "process/browser",
      crypto: "crypto-browserify"
    },
    configure: (webpackConfig) => {
      const isDev = process.env.NODE_ENV !== 'production';
      // Prefer faster, lighter devtool in development to speed startup
      if (isDev) {
        webpackConfig.devtool = 'eval-cheap-module-source-map';
      } else {
        // Only process source maps in production builds, and ignore all node_modules maps
        webpackConfig.module.rules.push({
          test: /\.js$/,
          enforce: 'pre',
          use: ['source-map-loader'],
          exclude: [/node_modules/]
        });
      }

      // Simplified module resolution
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        crypto: false,
        path: false,
        fs: false,
        util: false,
        stream: false,
        buffer: false,
        process: false
      };

      // Basic webpack plugins
      webpackConfig.plugins = [
        ...(webpackConfig.plugins || []),
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer']
        })
      ];

      // Silence known third-party source map warnings in dev
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /source map loader/,
      ];

      // Prefer resolving .jsx before .js to avoid accidental picks in basename duplicates
      if (webpackConfig.resolve && Array.isArray(webpackConfig.resolve.extensions)) {
        const exts = webpackConfig.resolve.extensions.filter(Boolean);
        const ordered = ['.jsx', '.js', '.json', '.mjs'];
        // Merge keeping preferred order first then remaining
        const rest = exts.filter((e) => !ordered.includes(e));
        webpackConfig.resolve.extensions = [...ordered, ...rest];
      }

      // Let CRA manage devServer; sanitize any problematic keys if present
      if (webpackConfig.devServer) {
        try {
          delete webpackConfig.devServer.allowedHosts;
          if (webpackConfig.devServer.client) {
            delete webpackConfig.devServer.client.webSocketURL;
            // Reduce overlay noise in dev while keeping errors visible in console
            if (isDev && typeof webpackConfig.devServer.client === 'object') {
              webpackConfig.devServer.client.overlay = { errors: true, warnings: false };
            }
          }
        } catch (_) {}
      }

      return webpackConfig;
    }
  },
  // Ensure webpack-dev-server options conform to schema
  devServer: (devServerConfig) => {
    const cfg = { ...devServerConfig };
    cfg.allowedHosts = 'all'; // or ['localhost']
    cfg.host = process.env.HOST || 'localhost';
    if (process.env.PORT) cfg.port = Number(process.env.PORT);
    // Auto-open browser on start unless user disables via BROWSER=none
    if ((process.env.BROWSER || '').toLowerCase() !== 'none') {
      cfg.open = true;
    }
    return cfg;
  },
  style: {
    postcss: {
      mode: 'extends',
      loaderOptions: {
        postcssOptions: {
          ident: 'postcss',
          plugins: [
            require('postcss-flexbugs-fixes'),
            require('postcss-preset-env')({
              autoprefixer: {
                flexbox: 'no-2009'
              },
              stage: 3
            })
          ]
        }
      }
    }
  }
};
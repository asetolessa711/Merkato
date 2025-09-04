const webpack = require('webpack');
const path = require('path');

module.exports = {
  // Disable built-in ESLint in dev to speed up startup and avoid loader noise
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
  cfg.allowedHosts = 'all';
  cfg.host = '0.0.0.0'; // bind IPv4 to ensure localhost (127.0.0.1) works on Windows
  cfg.port = Number(process.env.PORT || 3000);
  // Do not auto-open here; we'll open the browser after the server is ready via a script.
  cfg.open = false;
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
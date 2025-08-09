const webpack = require('webpack');
const path = require('path');

module.exports = {
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
      // Source map configuration
      webpackConfig.module.rules.push({
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: [/node_modules\/react-datepicker/]
      });

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

      // Development server configuration
      if (webpackConfig.devServer) {
        webpackConfig.devServer = {
          ...webpackConfig.devServer,
          client: {
            ...webpackConfig.devServer.client,
            webSocketURL: {
              hostname: 'localhost'
            }
          },
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
          }
        };
      }

      return webpackConfig;
    }
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
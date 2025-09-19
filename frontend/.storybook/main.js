const path = require('path');

module.exports = {
  stories: ['../src/**/*.stories.@(js|jsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {}
  },
  webpackFinal: async (config) => {
    // Ensure babel-loader handles our JSX in story files even if outside default include
    config.module.rules.push({
      test: /\.stories\.(js|jsx)$/,
      use: {
        loader: require.resolve('babel-loader'),
        options: {
          presets: [
            [require.resolve('@babel/preset-env'), { targets: { esmodules: true } }],
            [require.resolve('@babel/preset-react'), { runtime: 'automatic' }]
          ]
        }
      }
    });
    // Also ensure all project source JS/JSX is transpiled (some files not picked up by default chain)
    config.module.rules.push({
      test: /\.(js|jsx)$/,
      include: path.resolve(__dirname, '../src'),
      use: {
        loader: require.resolve('babel-loader'),
        options: {
          presets: [
            [require.resolve('@babel/preset-env'), { targets: { esmodules: true } }],
            [require.resolve('@babel/preset-react'), { runtime: 'automatic' }]
          ]
        }
      }
    });
    return config;
  }
};

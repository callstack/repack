const path = require('path');
const { ReactNativeTargetPlugin } = require('../../src');

module.exports = {
  mode: 'development',
  context: __dirname,
  devtool: false,
  entry: './src/a.js',
  output: {
    path: path.join(__dirname, 'build'),
  },
  plugins: [new ReactNativeTargetPlugin()],
};

// eslint-disable-next-line import/no-extraneous-dependencies
const { createTransformer } = require('babel-jest').default;

const transformer = createTransformer({
  configFile: require.resolve('./babel.config.js'),
});

module.exports = transformer;

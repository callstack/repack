// based on https://github.com/facebook/metro/blob/main/babel.config.js
const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies

const pathMap = {
  resolver: {
    '../index': 'resolve',
    '../errors/FailedToResolvePathError': 'resolve-error',
    // ignored
    '../types': '../types',
  },
};

const resolvePath = (sourcePath, currentFile) => {
  const dir = path.basename(path.dirname(path.dirname(currentFile)));
  if (sourcePath.startsWith('.') && pathMap[dir]?.[sourcePath]) {
    return require.resolve(path.join(__dirname, dir, pathMap[dir][sourcePath]));
  } else {
    return require.resolve(sourcePath, { paths: [path.dirname(currentFile)] });
  }
};

const plugins = [
  'babel-plugin-syntax-hermes-parser',
  '@babel/plugin-transform-flow-strip-types',
  '@babel/plugin-transform-modules-commonjs',
  '@babel/plugin-syntax-class-properties',
];

module.exports = {
  babelrc: false,
  browserslistConfigFile: false,
  plugins: [
    ...plugins.map((plugin) => require.resolve(plugin)),
    [require.resolve('babel-plugin-module-resolver'), { resolvePath }],
  ],
};

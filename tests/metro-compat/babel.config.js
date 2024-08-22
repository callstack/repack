// based on https://github.com/facebook/metro/blob/main/babel.config.js
const path = require('path');

const pathMap = {
  resolver: {
    '../index': './resolve.ts',
    '../errors/FailedToResolvePathError': './resolve-error.ts',
    // ignored
    '../types': '../types',
  },
};

const resolvePath = (sourcePath, currentFile) => {
  const dir = path.basename(path.dirname(path.dirname(currentFile)));
  if (sourcePath.startsWith('.') && pathMap[dir]?.[sourcePath]) {
    return path.join(__dirname, dir, pathMap[dir][sourcePath]);
  } else {
    return require.resolve(sourcePath, { paths: [path.dirname(currentFile)] });
  }
};

const jsPlugins = [
  'babel-plugin-syntax-hermes-parser',
  '@babel/plugin-transform-flow-strip-types',
  '@babel/plugin-transform-modules-commonjs',
  '@babel/plugin-syntax-class-properties',
];

const tsPlugins = [
  '@babel/plugin-transform-typescript',
  '@babel/plugin-transform-modules-commonjs',
  '@babel/plugin-syntax-class-properties',
];

module.exports = {
  babelrc: false,
  browserslistConfigFile: false,
  overrides: [
    {
      test: ['**/*.ts'],
      plugins: tsPlugins.map((plugin) => require.resolve(plugin)),
    },
    {
      test: ['**/*.js'],
      plugins: [
        ...jsPlugins.map((plugin) => require.resolve(plugin)),
        [require.resolve('babel-plugin-module-resolver'), { resolvePath }],
      ],
    },
  ],
};

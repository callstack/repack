const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { rspack } = require('@rspack/core');
const { ExpoPlugin } = require('../dist/rspack/index.js');
const {
  installFixtureDependencies,
} = require('./helpers/installFixtureDependencies.cjs');

// React Native libraries such as React Navigation publish `"type": "module"`
// builds whose imports omit the extension and rely on platform extensions,
// for example `./useBackButton` resolving to `useBackButton.native.js`.
function createProjectWithEsmLibrary() {
  const projectRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'repack-expo-esm-resolution-'))
  );
  const files = {
    'babel.config.cjs': "module.exports = { presets: ['babel-preset-expo'] };",
    'index.js': [
      "import { platformValue } from 'esm-library';",
      'globalThis.__EXPO_REPACK_ESM_VALUE__ = platformValue;',
    ].join('\n'),
    'package.json': JSON.stringify({
      dependencies: { expo: '56.0.0' },
      main: 'index.js',
      name: 'repack-expo-esm-resolution-test',
    }),
    'node_modules/esm-library/package.json': JSON.stringify({
      main: 'lib/index.js',
      name: 'esm-library',
      type: 'module',
    }),
    'node_modules/esm-library/lib/index.js':
      "export { platformValue } from './platformValue';",
    'node_modules/esm-library/lib/platformValue.native.js':
      "export const platformValue = 'esm-native-platform-value';",
  };

  for (const [filename, contents] of Object.entries(files)) {
    const filePath = path.join(projectRoot, filename);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
  }

  installFixtureDependencies(projectRoot, [
    'babel-preset-expo',
    'expo',
    'react',
    'react-native',
  ]);
  return projectRoot;
}

function runCompiler(compiler) {
  return new Promise((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) return reject(error);
      if (!stats) return reject(new Error('Rspack returned no stats'));
      const compilationError = stats.hasErrors()
        ? new Error(stats.toString({ all: false, errors: true }))
        : undefined;
      compiler.close((closeError) => {
        if (compilationError) reject(compilationError);
        else if (closeError) reject(closeError);
        else resolve(stats);
      });
    });
  });
}

test('resolves extensionless platform imports inside "type": "module" packages', async () => {
  const projectRoot = createProjectWithEsmLibrary();
  const compiler = rspack({
    context: projectRoot,
    mode: 'development',
    module: {
      rules: [
        {
          test: /\.js$/,
          type: 'javascript/auto',
          use: {
            loader: require.resolve('@callstack/repack/babel-loader'),
            options: { cwd: projectRoot },
          },
        },
      ],
    },
    name: 'ios',
    optimization: { minimize: false },
    output: {
      filename: '[name].bundle',
      path: path.join(projectRoot, 'dist'),
      uniqueName: 'repack-expo-esm-resolution-test',
    },
    plugins: [
      new ExpoPlugin({
        platform: 'ios',
        projectRoot,
        repack: { logger: { console: false } },
      }),
    ],
  });

  await runCompiler(compiler);

  const bundle = fs.readFileSync(
    path.join(projectRoot, 'dist', 'main.bundle'),
    'utf8'
  );
  assert.match(bundle, /esm-native-platform-value/);
});

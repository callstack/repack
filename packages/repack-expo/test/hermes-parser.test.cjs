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

// Expo applications use babel-preset-expo and don't install
// @react-native/babel-preset, which Re.Pack's Babel loader otherwise uses to
// locate hermes-parser.
function createProjectWithoutReactNativeBabelPreset() {
  const projectRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'repack-expo-hermes-parser-'))
  );
  const files = {
    'babel.config.cjs': "module.exports = { presets: ['babel-preset-expo'] };",
    'index.js': [
      "import { label } from './label.js';",
      'globalThis.__EXPO_REPACK_HERMES_PARSER__ = label;',
    ].join('\n'),
    'label.js': "export const label = 'parsed-without-rn-babel-preset';",
    'package.json': JSON.stringify({
      dependencies: { expo: '56.0.0' },
      main: 'index.js',
      name: 'repack-expo-hermes-parser-test',
    }),
  };

  for (const [filename, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(projectRoot, filename), contents);
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

test('compiles application sources without @react-native/babel-preset installed', async () => {
  const projectRoot = createProjectWithoutReactNativeBabelPreset();
  assert.equal(
    fs.existsSync(
      path.join(projectRoot, 'node_modules', '@react-native', 'babel-preset')
    ),
    false
  );

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
      uniqueName: 'repack-expo-hermes-parser-test',
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
  assert.match(bundle, /parsed-without-rn-babel-preset/);
});

const {
  resolveHermesParser,
} = require('../dist/rspack/loaders/resolveHermesParser.js');

function createEmptyProject(dependencies) {
  const projectRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'repack-expo-hermes-resolve-'))
  );
  installFixtureDependencies(projectRoot, dependencies);
  return projectRoot;
}

function hermesParserThroughPreset(projectRoot, preset) {
  const presetPath = require.resolve(preset, { paths: [projectRoot] });
  const syntaxPluginPath = require.resolve(
    'babel-plugin-syntax-hermes-parser',
    { paths: [presetPath] }
  );
  return require.resolve('hermes-parser', { paths: [syntaxPluginPath] });
}

test('resolves hermes-parser through the application babel-preset-expo first', () => {
  const projectRoot = createEmptyProject([
    '@react-native/babel-preset',
    'babel-preset-expo',
  ]);

  assert.equal(
    resolveHermesParser(projectRoot),
    hermesParserThroughPreset(projectRoot, 'babel-preset-expo')
  );
});

test('falls back to the application @react-native/babel-preset', () => {
  const projectRoot = createEmptyProject(['@react-native/babel-preset']);

  assert.equal(
    resolveHermesParser(projectRoot),
    hermesParserThroughPreset(projectRoot, '@react-native/babel-preset')
  );
});

test('falls back to the bundled hermes-parser without an application preset', () => {
  const projectRoot = createEmptyProject([]);

  assert.equal(
    resolveHermesParser(projectRoot),
    require.resolve('hermes-parser')
  );
});

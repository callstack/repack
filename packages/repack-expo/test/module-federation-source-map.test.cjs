const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { rspack } = require('@rspack/core');
const {
  plugins: { ModuleFederationPluginV2 },
} = require('@callstack/repack');

const { ExpoPlugin } = require('../dist/rspack/index.js');

const requireFromDevServer = createRequire(
  path.resolve(__dirname, '../../dev-server/package.json')
);
const { SourceMapConsumer } = requireFromDevServer('source-map');

function createProject() {
  const projectRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'repack-expo-mf-source-map-'))
  );
  fs.writeFileSync(
    path.join(projectRoot, 'package.json'),
    JSON.stringify({
      dependencies: { expo: '56.0.0' },
      main: 'index.js',
      name: 'repack-expo-mf-source-map-test',
    })
  );
  fs.writeFileSync(
    path.join(projectRoot, 'index.js'),
    "globalThis.__REPACK_EXPO_SOURCE_MAP__ = 'ordinary-source';"
  );
  fs.writeFileSync(
    path.join(projectRoot, 'babel.config.cjs'),
    "module.exports = { presets: ['babel-preset-expo'] };"
  );

  fs.mkdirSync(path.join(projectRoot, 'node_modules'));
  for (const packageName of ['babel-preset-expo', 'expo']) {
    fs.symlinkSync(
      fs.realpathSync(
        path.join(
          __dirname,
          '..',
          '..',
          '..',
          'apps',
          'tester-expo',
          'node_modules',
          packageName
        )
      ),
      path.join(projectRoot, 'node_modules', packageName),
      'junction'
    );
  }

  const scopeRoot = path.join(
    projectRoot,
    'node_modules',
    '@module-federation'
  );
  fs.mkdirSync(scopeRoot, { recursive: true });
  fs.symlinkSync(
    fs.realpathSync(
      path.join(
        __dirname,
        '..',
        '..',
        'repack',
        'node_modules',
        '@module-federation',
        'enhanced'
      )
    ),
    path.join(scopeRoot, 'enhanced'),
    'junction'
  );
  const reactNativeScopeRoot = path.join(
    projectRoot,
    'node_modules',
    '@react-native'
  );
  fs.mkdirSync(reactNativeScopeRoot, { recursive: true });
  fs.symlinkSync(
    fs.realpathSync(
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        'apps',
        'tester-expo',
        'node_modules',
        '@react-native',
        'babel-preset'
      )
    ),
    path.join(reactNativeScopeRoot, 'babel-preset'),
    'junction'
  );
  fs.symlinkSync(
    fs.realpathSync(
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        'apps',
        'tester-expo',
        'node_modules',
        'react-native'
      )
    ),
    path.join(projectRoot, 'node_modules', 'react-native'),
    'junction'
  );

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

test('emits symbolication-safe development source maps with Module Federation v2 in either plugin order', async () => {
  for (const expoFirst of [true, false]) {
    const projectRoot = createProject();
    const expoPlugin = new ExpoPlugin({ repack: { logger: false } });
    const federationPlugin = new ModuleFederationPluginV2({
      dts: false,
      name: 'ExpoHost',
    });
    const compiler = rspack({
      context: projectRoot,
      devServer: { host: 'localhost', port: 8081 },
      devtool: 'source-map',
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
      output: {
        filename: '[name].bundle',
        path: path.join(projectRoot, 'dist'),
        publicPath: 'http://localhost:8081/',
        uniqueName: 'repack-expo-mf-source-map-test',
      },
      plugins: expoFirst
        ? [expoPlugin, federationPlugin]
        : [federationPlugin, expoPlugin],
    });

    await runCompiler(compiler);

    const sourceMap = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'dist', 'main.bundle.map'), 'utf8')
    );
    const ordinarySourceIndex = sourceMap.sourcesContent.findIndex((source) =>
      source?.includes('ordinary-source')
    );

    assert.notEqual(ordinarySourceIndex, -1);
    assert.equal(
      sourceMap.sources[ordinarySourceIndex],
      '[projectRoot]/index.js'
    );
    assert.match(
      sourceMap.sourcesContent[ordinarySourceIndex],
      /ordinary-source/
    );
    assert.notEqual(sourceMap.mappings, '');
    assert.equal(
      sourceMap.sources.some((source) =>
        source.startsWith('webpack://=="undefined"}')
      ),
      false
    );
    assert.equal(
      sourceMap.sources.some((source) =>
        source.startsWith('webpack://module-federation/virtual-runtime-')
      ),
      true
    );

    await SourceMapConsumer.with(
      sourceMap,
      'http://localhost:8081/index.bundle.map?platform=ios',
      (consumer) =>
        assert.equal(consumer.sources.length, sourceMap.sources.length)
    );
  }
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { rspack } = require('@rspack/core');
const { ExpoPlugin } = require('../dist/rspack/index.js');

class EmitAuxiliaryAssetPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      'EmitExpoRepackSeamAsset',
      (compilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: 'EmitExpoRepackSeamAsset',
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
          },
          () => {
            compilation.emitAsset(
              'remote-assets/repack-seam.txt',
              new compiler.webpack.sources.RawSource('auxiliary-seam')
            );
          }
        );
      }
    );
  }
}

function createProject() {
  const projectRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'repack-expo-options-'))
  );
  const files = {
    'babel.config.cjs': "module.exports = { presets: ['babel-preset-expo'] };",
    'index.js': [
      "globalThis.__EXPO_REPACK_MAIN__ = 'main-seam';",
      "void import(/* webpackChunkName: 'lazy-card' */ './lazy.js');",
    ].join('\n'),
    'initialize-core.js':
      "globalThis.__EXPO_REPACK_INITIALIZE_CORE__ = 'initialize-core-seam';",
    'lazy.js': "export const lazyCard = 'lazy-card-seam';",
    'package.json': JSON.stringify({
      dependencies: { expo: '56.0.0' },
      main: 'index.js',
      name: 'repack-expo-options-test',
    }),
  };

  for (const [filename, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(projectRoot, filename), contents);
  }

  fs.symlinkSync(
    path.resolve(__dirname, '../../../apps/tester-expo/node_modules'),
    path.join(projectRoot, 'node_modules'),
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

test('forwards RepackPlugin options through public compiler behavior', async () => {
  const projectRoot = createProject();
  const auxiliaryAssetsPath = path.join(projectRoot, 'copied-auxiliary');
  const remoteOutputPath = path.join(projectRoot, 'copied-remote');
  const loggerEntries = [];
  const compiler = rspack({
    context: projectRoot,
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
    name: 'android',
    optimization: { minimize: false },
    output: {
      filename: '[name].bundle',
      path: path.join(projectRoot, 'dist'),
      uniqueName: 'repack-expo-options-test',
    },
    plugins: [
      new ExpoPlugin({
        platform: 'android',
        projectRoot,
        repack: {
          extraChunks: [{ outputPath: remoteOutputPath, type: 'remote' }],
          initializeCore: path.join(projectRoot, 'initialize-core.js'),
          logger: {
            console: false,
            listener: (entry) => loggerEntries.push(entry),
          },
          output: { auxiliaryAssetsPath },
          platform: 'android',
        },
      }),
      new EmitAuxiliaryAssetPlugin(),
    ],
  });

  compiler.hooks.infrastructureLog.call('ExpoRepackSeam', 'info', [
    'logger-seam',
  ]);
  await runCompiler(compiler);

  assert.equal(
    loggerEntries.some(
      (entry) =>
        entry.issuer === 'ExpoRepackSeam' &&
        entry.type === 'info' &&
        entry.message.includes('logger-seam')
    ),
    true
  );

  const mainBundle = fs.readFileSync(
    path.join(projectRoot, 'dist', 'main.bundle'),
    'utf8'
  );
  assert.match(mainBundle, /initialize-core-seam/);
  assert.match(mainBundle, /sourceMappingURL=.*\?platform=android/);

  assert.equal(
    fs.readFileSync(
      path.join(auxiliaryAssetsPath, 'remote-assets', 'repack-seam.txt'),
      'utf8'
    ),
    'auxiliary-seam'
  );

  const lazyBundle = fs
    .readdirSync(remoteOutputPath)
    .find((file) => file.endsWith('.chunk.bundle'));
  assert.ok(lazyBundle);
  assert.match(
    fs.readFileSync(path.join(remoteOutputPath, lazyBundle), 'utf8'),
    /lazy-card-seam/
  );
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { transformSync } = require('@babel/core');
const { rspack } = require('@rspack/core');
const { ExpoPlugin } = require('../dist/rspack/index.js');
const {
  configureExpoPublicEnvironment,
} = require('../dist/rspack/environment/configureExpoPublicEnvironment.js');

const {
  getExpoEnvironmentFiles,
  resolveExpoPublicEnvironment,
} = require('../dist/rspack/environment/expoPublicEnvironment.js');
const inlineExpoPublicEnvironment =
  require('../dist/rspack/babel/inlineExpoPublicEnvironment.js').default;

function createEnvironmentProject(files) {
  const projectRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'repack-expo-env-'))
  );
  for (const [filename, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(projectRoot, filename), contents);
  }
  return projectRoot;
}

async function withProcessEnvironment(overrides, callback) {
  const original = new Map(
    Object.keys(overrides).map((key) => [key, process.env[key]])
  );
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return await callback();
  } finally {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function createRspackEnvironmentProject(mode) {
  const projectRoot = createEnvironmentProject({
    [`.env.${mode}.local`]: [
      'EXPO_PUBLIC_PLATFORM_VALUE=public-platform-value',
      'EXPO_PUBLIC_WATCH_VALUE=public-watch-initial',
      'PRIVATE_TEST_SECRET=private-value-that-must-not-escape',
    ].join('\n'),
    'babel.config.cjs': "module.exports = { presets: ['babel-preset-expo'] };",
    'index.js': [
      'globalThis.__REPACK_EXPO_ENV_TEST__ = {',
      '  platform: process.env.EXPO_PUBLIC_PLATFORM_VALUE,',
      '  shell: process.env.EXPO_PUBLIC_SHELL_VALUE,',
      '  watch: process.env.EXPO_PUBLIC_WATCH_VALUE,',
      '  privateValue: process.env.PRIVATE_TEST_SECRET,',
      '  privateShellValue: process.env.PRIVATE_SHELL_SECRET,',
      '};',
    ].join('\n'),
    'package.json': JSON.stringify({
      dependencies: { expo: '56.0.0' },
      main: 'index.js',
      name: 'repack-expo-environment-test',
    }),
  });
  const workspaceNodeModules = path.resolve(
    __dirname,
    '../../../apps/tester-expo/node_modules'
  );
  fs.symlinkSync(workspaceNodeModules, path.join(projectRoot, 'node_modules'));
  return projectRoot;
}

function createEnvironmentCompiler(
  projectRoot,
  mode,
  platform,
  { cacheDirectory, parallelLoader = false } = {}
) {
  return rspack({
    context: projectRoot,
    devtool: 'source-map',
    mode,
    module: {
      rules: [
        {
          test: /\.js$/,
          type: 'javascript/auto',
          use: {
            loader: require.resolve('@callstack/repack/babel-loader'),
            ...(parallelLoader ? { parallel: true } : {}),
            options: { cwd: projectRoot },
          },
        },
      ],
    },
    experiments: {
      ...(cacheDirectory
        ? {
            cache: {
              storage: { directory: cacheDirectory, type: 'filesystem' },
              type: 'persistent',
            },
          }
        : {}),
      ...(parallelLoader ? { parallelLoader: true } : {}),
    },
    name: platform,
    output: {
      path: path.join(projectRoot, 'dist', platform),
      uniqueName: `repack-expo-environment-${platform}`,
    },
    plugins: [new ExpoPlugin({ platform, projectRoot })],
    watchOptions: { ignored: /node_modules/, poll: 100 },
  });
}

function compilationArtifacts(stats) {
  const emitted = Object.values(stats.compilation.assets)
    .map((asset) => asset.source().toString())
    .join('\n');
  const serializedStats = JSON.stringify(stats.toJson({ all: true }));
  return `${emitted}\n${serializedStats}`;
}

function runCompiler(compiler) {
  return new Promise((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) return reject(error);
      if (!stats) return reject(new Error('Rspack returned no stats'));
      if (stats.hasErrors()) {
        return reject(new Error(stats.toString({ all: false, errors: true })));
      }
      compiler.close((closeError) => {
        if (closeError) reject(closeError);
        else resolve(stats);
      });
    });
  });
}

function closeWatcher(watcher) {
  return new Promise((resolve, reject) => {
    watcher.close((error) => (error ? reject(error) : resolve()));
  });
}

function closeCompiler(compiler) {
  return new Promise((resolve, reject) => {
    compiler.close((error) => (error ? reject(error) : resolve()));
  });
}

function runTwoBuildWatch({
  afterFirstBuild,
  compiler,
  timeoutMessage,
  timeoutMs,
  verifySecondBuild,
}) {
  return new Promise((resolve, reject) => {
    let build = 0;
    let finished = false;

    const finish = async (buildError) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);

      let closeError;
      try {
        await closeWatcher(watcher);
      } catch (error) {
        closeError = error;
      }
      try {
        await closeCompiler(compiler);
      } catch (error) {
        closeError ??= error;
      }

      const error = buildError ?? closeError;
      if (error) reject(error);
      else resolve();
    };

    const timeout = setTimeout(() => {
      void finish(new Error(timeoutMessage));
    }, timeoutMs);

    const watcher = compiler.watch({}, (error, stats) => {
      if (finished) return;
      if (error || !stats || stats.hasErrors()) {
        void finish(
          error ??
            new Error(
              stats?.toString({ all: false, errors: true }) ??
                'Rspack returned no stats'
            )
        );
        return;
      }

      build += 1;
      const artifacts = compilationArtifacts(stats);
      try {
        if (build === 1) {
          afterFirstBuild(artifacts);
        } else if (build === 2) {
          verifySecondBuild(artifacts);
          void finish();
        }
      } catch (assertionError) {
        void finish(assertionError);
      }
    });
  });
}

test('resolves Expo development and production dotenv precedence without exposing private values', () => {
  const projectRoot = createEnvironmentProject({
    '.env': [
      'EXPO_PUBLIC_VALUE=base',
      'EXPO_PUBLIC_EXPANDED=${SHARED_SUFFIX}-base',
      'PRIVATE_TEST_SECRET=private-value-that-must-not-escape',
    ].join('\n'),
    '.env.development': 'EXPO_PUBLIC_VALUE=development',
    '.env.development.local': 'EXPO_PUBLIC_VALUE=development-local',
    '.env.local': 'EXPO_PUBLIC_VALUE=local',
    '.env.production': 'EXPO_PUBLIC_VALUE=production',
    '.env.production.local': 'EXPO_PUBLIC_VALUE=production-local',
  });
  const systemEnv = {
    EXPO_PUBLIC_SHELL: 'shell-wins',
    SHARED_SUFFIX: 'from-shell',
  };

  const development = resolveExpoPublicEnvironment({
    mode: 'development',
    projectRoot,
    systemEnv,
  });
  const production = resolveExpoPublicEnvironment({
    mode: 'production',
    projectRoot,
    systemEnv,
  });

  assert.deepEqual(development, {
    EXPO_PUBLIC_EXPANDED: 'from-shell-base',
    EXPO_PUBLIC_SHELL: 'shell-wins',
    EXPO_PUBLIC_VALUE: 'development-local',
  });
  assert.deepEqual(production, {
    EXPO_PUBLIC_EXPANDED: 'from-shell-base',
    EXPO_PUBLIC_SHELL: 'shell-wins',
    EXPO_PUBLIC_VALUE: 'production-local',
  });
  assert.equal('PRIVATE_TEST_SECRET' in development, false);
  assert.deepEqual(
    getExpoEnvironmentFiles(projectRoot, 'development').map((file) =>
      path.basename(file)
    ),
    ['.env.development.local', '.env.local', '.env.development', '.env']
  );
});

test('preserves shell precedence and treats missing optional dotenv files as harmless', () => {
  const projectRoot = createEnvironmentProject({
    '.env': 'EXPO_PUBLIC_VALUE=from-file',
  });

  assert.deepEqual(
    resolveExpoPublicEnvironment({
      mode: 'development',
      projectRoot,
      systemEnv: { EXPO_PUBLIC_VALUE: 'from-shell' },
    }),
    { EXPO_PUBLIC_VALUE: 'from-shell' }
  );
});

test('does not expose private values in Expo dotenv validation diagnostics', () => {
  const privateValue = 'private-diagnostic-value-that-must-not-escape';
  const projectRoot = createEnvironmentProject({
    '.env': [
      `FASTLANE_PASSWORD=${privateValue}`,
      `PRIVATE_TEST_SECRET=${privateValue}`,
    ].join('\n'),
  });

  assert.throws(
    () =>
      resolveExpoPublicEnvironment({
        mode: 'production',
        projectRoot,
        systemEnv: {},
      }),
    (error) => {
      assert.match(
        error.message,
        /Refused to load personal environment variables/
      );
      assert.match(error.message, /FASTLANE_PASSWORD/);
      assert.doesNotMatch(error.message, new RegExp(privateValue));
      return true;
    }
  );
});

test('honors EXPO_NO_DOTENV and the production client-variable opt-out', async () => {
  const projectRoot = createEnvironmentProject({
    '.env': 'EXPO_PUBLIC_FILE=file-value',
  });

  await withProcessEnvironment(
    { EXPO_NO_CLIENT_ENV_VARS: undefined, EXPO_NO_DOTENV: '1' },
    () => {
      assert.deepEqual(
        resolveExpoPublicEnvironment({
          mode: 'development',
          projectRoot,
          systemEnv: {
            EXPO_NO_DOTENV: '1',
            EXPO_PUBLIC_SHELL: 'shell-value',
          },
        }),
        { EXPO_PUBLIC_SHELL: 'shell-value' }
      );
    }
  );

  await withProcessEnvironment(
    { EXPO_NO_CLIENT_ENV_VARS: '1', EXPO_NO_DOTENV: undefined },
    () => {
      assert.deepEqual(
        resolveExpoPublicEnvironment({
          mode: 'production',
          projectRoot,
          systemEnv: { EXPO_NO_CLIENT_ENV_VARS: '1' },
        }),
        {}
      );
      assert.deepEqual(
        resolveExpoPublicEnvironment({
          mode: 'development',
          projectRoot,
          systemEnv: { EXPO_NO_CLIENT_ENV_VARS: '1' },
        }),
        { EXPO_PUBLIC_FILE: 'file-value' }
      );
    }
  );
});

test('inlines Expo-supported static public accesses and leaves unsupported or private accesses intact', () => {
  const environment = {
    EXPO_PUBLIC_BRACKET: 'bracket-value',
    EXPO_PUBLIC_DOT: 'dot-value',
    EXPO_PUBLIC_INNER_OPTIONAL: 'inner-optional-value',
    EXPO_PUBLIC_OPTIONAL: 'optional-value',
  };
  const source = [
    'const dot = process.env.EXPO_PUBLIC_DOT;',
    "const bracket = process['env']['EXPO_PUBLIC_BRACKET'];",
    'const optional = process.env?.EXPO_PUBLIC_OPTIONAL;',
    'const innerOptional = process?.env.EXPO_PUBLIC_INNER_OPTIONAL;',
    'const missing = process.env.EXPO_PUBLIC_MISSING;',
    'const dynamic = process.env[key];',
    'const publicDynamic = process.env[EXPO_PUBLIC_DOT];',
    'const dynamicEnv = process[env].EXPO_PUBLIC_DOT;',
    'const privateValue = process.env.PRIVATE_TEST_SECRET;',
    "process.env.EXPO_PUBLIC_DOT = 'assigned';",
    'const { EXPO_PUBLIC_DOT } = process.env;',
  ].join('\n');

  const result = transformSync(source, {
    babelrc: false,
    caller: { name: 'repack-expo-test', isNodeModule: false },
    configFile: false,
    plugins: [[inlineExpoPublicEnvironment, { environment }]],
  }).code;

  assert.match(result, /dot-value/);
  assert.match(result, /bracket-value/);
  assert.match(result, /optional-value/);
  assert.match(result, /inner-optional-value/);
  assert.match(result, /const missing = undefined/);
  assert.match(result, /process\.env\[key\]/);
  assert.match(result, /process\.env\[EXPO_PUBLIC_DOT\]/);
  assert.match(result, /process\[env\]\.EXPO_PUBLIC_DOT/);
  assert.match(result, /process\.env\.PRIVATE_TEST_SECRET/);
  assert.match(result, /process\.env\.EXPO_PUBLIC_DOT = 'assigned'/);
  assert.match(result, /EXPO_PUBLIC_DOT\s*\}\s*= process\.env/);
});

test('does not inline public accesses in dependencies', () => {
  const environment = {
    EXPO_PUBLIC_VALUE: 'must-not-inline',
  };

  const result = transformSync('process.env.EXPO_PUBLIC_VALUE;', {
    babelrc: false,
    caller: { name: 'repack-expo-test', isNodeModule: true },
    configFile: false,
    plugins: [[inlineExpoPublicEnvironment, { environment }]],
  }).code;

  assert.match(result, /process\.env\.EXPO_PUBLIC_VALUE/);
  assert.doesNotMatch(result, /must-not-inline/);
});

test('emits public values identically for both native platforms without leaking private dotenv values', async () => {
  const projectRoot = createRspackEnvironmentProject('production');

  for (const platform of ['ios', 'android']) {
    const stats = await runCompiler(
      createEnvironmentCompiler(projectRoot, 'production', platform)
    );
    const artifacts = compilationArtifacts(stats);
    assert.match(artifacts, /public-platform-value/);
    assert.doesNotMatch(artifacts, /private-value-that-must-not-escape/);
  }
});

test('inlines public environment values through Rspack parallel loader workers', async () => {
  const projectRoot = createRspackEnvironmentProject('production');

  await withProcessEnvironment(
    {
      EXPO_PUBLIC_SHELL_VALUE: 'parallel-public-shell-value',
      PRIVATE_SHELL_SECRET: 'parallel-private-shell-value',
    },
    async () => {
      const stats = await runCompiler(
        createEnvironmentCompiler(projectRoot, 'production', 'ios', {
          parallelLoader: true,
        })
      );
      const artifacts = compilationArtifacts(stats);
      assert.match(artifacts, /public-platform-value/);
      assert.match(artifacts, /parallel-public-shell-value/);
      assert.doesNotMatch(artifacts, /private-value-that-must-not-escape/);
      assert.doesNotMatch(artifacts, /parallel-private-shell-value/);
    }
  );
});

test('invalidates Rspack persistent loader cache when a public shell value changes', async () => {
  const projectRoot = createRspackEnvironmentProject('development');
  const cacheDirectory = path.join(projectRoot, 'rspack-cache');

  await withProcessEnvironment(
    {
      EXPO_PUBLIC_SHELL_VALUE: 'first-public-shell-value',
      PRIVATE_SHELL_SECRET: 'persistent-private-shell-value',
    },
    async () => {
      const firstStats = await runCompiler(
        createEnvironmentCompiler(projectRoot, 'development', 'ios', {
          cacheDirectory,
        })
      );
      assert.match(
        compilationArtifacts(firstStats),
        /first-public-shell-value/
      );

      process.env.EXPO_PUBLIC_SHELL_VALUE = 'second-public-shell-value';
      const secondStats = await runCompiler(
        createEnvironmentCompiler(projectRoot, 'development', 'ios', {
          cacheDirectory,
        })
      );
      const secondArtifacts = compilationArtifacts(secondStats);
      assert.match(secondArtifacts, /second-public-shell-value/);
      assert.doesNotMatch(secondArtifacts, /first-public-shell-value/);
      assert.doesNotMatch(secondArtifacts, /persistent-private-shell-value/);
    }
  );
});

test('adds the Expo environment digest to both Rspack persistent cache locations', () => {
  const projectRoot = createEnvironmentProject({
    '.env': 'EXPO_PUBLIC_VALUE=cache-value',
  });

  for (const location of ['cache', 'experiments']) {
    const cache = { type: 'persistent', version: 'base-version' };
    const compiler = {
      options: {
        mode: 'development',
        ...(location === 'cache' ? { cache } : { experiments: { cache } }),
      },
    };

    const environment = configureExpoPublicEnvironment(compiler, projectRoot);

    assert.equal(
      cache.version,
      `base-version|RepackExpoPublicEnvironmentPlugin:${environment.digest}`
    );
  }
});

test('rebuilds transformed application modules when an Expo public dotenv value changes', async () => {
  const projectRoot = createRspackEnvironmentProject('development');
  const envFile = path.join(projectRoot, '.env.development.local');
  const compiler = createEnvironmentCompiler(projectRoot, 'development', 'ios');

  await runTwoBuildWatch({
    afterFirstBuild(artifacts) {
      assert.match(artifacts, /public-watch-initial/);
      fs.writeFileSync(
        envFile,
        [
          'EXPO_PUBLIC_PLATFORM_VALUE=public-platform-value',
          'EXPO_PUBLIC_WATCH_VALUE=public-watch-rebuilt',
          'PRIVATE_TEST_SECRET=private-value-that-must-not-escape',
        ].join('\n')
      );
    },
    compiler,
    timeoutMessage: 'Timed out waiting for dotenv rebuild',
    timeoutMs: 30_000,
    verifySecondBuild(artifacts) {
      assert.match(artifacts, /public-watch-rebuilt/);
      assert.doesNotMatch(artifacts, /private-value-that-must-not-escape/);
    },
  });
});

test('rebuilds parallel loader modules when a selected public dotenv file is created', async () => {
  const projectRoot = createRspackEnvironmentProject('development');
  const envFile = path.join(projectRoot, '.env.development.local');
  fs.unlinkSync(envFile);
  const compiler = createEnvironmentCompiler(
    projectRoot,
    'development',
    'ios',
    { parallelLoader: true }
  );

  await runTwoBuildWatch({
    afterFirstBuild(artifacts) {
      assert.doesNotMatch(artifacts, /public-created-value/);
      fs.writeFileSync(
        envFile,
        [
          'EXPO_PUBLIC_WATCH_VALUE=public-created-value',
          'PRIVATE_TEST_SECRET=created-private-value',
        ].join('\n')
      );
    },
    compiler,
    timeoutMessage: 'Timed out waiting for created dotenv rebuild',
    timeoutMs: 15_000,
    verifySecondBuild(artifacts) {
      assert.match(artifacts, /public-created-value/);
      assert.doesNotMatch(artifacts, /created-private-value/);
    },
  });
});

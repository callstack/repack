const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { rspack } = require('@rspack/core');
const {
  plugins: { ModuleFederationPluginV2 },
} = require('@callstack/repack');

const { ExpoPlugin, ExpoPluginError } = require('../dist/rspack/index.js');
const {
  withExpoBabelCaller,
} = require('../dist/rspack/loaders/withExpoBabelCaller.js');
const expoRouterEntryLoader =
  require('../dist/rspack/loaders/expoRouterEntryLoader.js').default;

function getExpoBabelLoaderOptions(
  loaderOptions,
  {
    dependencies = [],
    missingDependencies = [],
    resourcePath = '/project/app/index.tsx',
  } = {}
) {
  const babelLoader = require('@callstack/repack/babel-loader');
  const expoBabelLoaderPath = require.resolve(
    '../dist/rspack/loaders/expoBabelLoader.js'
  );
  const originalBabelLoader = babelLoader.default;
  let capturedOptions;

  babelLoader.default = function captureOptions() {
    capturedOptions = this.getOptions();
  };
  delete require.cache[expoBabelLoaderPath];

  try {
    const expoBabelLoader = require(expoBabelLoaderPath).default;
    expoBabelLoader.call(
      {
        addDependency(filename) {
          dependencies.push(filename);
        },
        addMissingDependency(filename) {
          missingDependencies.push(filename);
        },
        getOptions() {
          return loaderOptions;
        },
        resourcePath,
      },
      ''
    );
  } finally {
    babelLoader.default = originalBabelLoader;
    delete require.cache[expoBabelLoaderPath];
  }

  return capturedOptions;
}

class RepackPlugin {}

class DefinePlugin {
  constructor(definitions) {
    this.definitions = definitions;
  }

  apply(compiler) {
    compiler.appliedDefinitions.push(this.definitions);
  }
}

test('uses the ExpoModulesPlugin constructor name expected by Re.Pack CLI validation', () => {
  assert.equal(new ExpoPlugin().constructor.name, 'ExpoModulesPlugin');
});

function createPackage(packageRoot, name, version) {
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({ name, version })
  );
}

function createProject({
  main = 'index.js',
  rootAssetsRegistryVersion,
  routerRoot = 'app',
} = {}) {
  const projectRoot = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'repack-expo-plugin-'))
  );
  fs.writeFileSync(
    path.join(projectRoot, 'package.json'),
    JSON.stringify({ dependencies: { expo: '56.0.0' }, main })
  );
  const reactNativeRoot = path.join(
    projectRoot,
    'node_modules',
    'react-native'
  );
  createPackage(reactNativeRoot, 'react-native', '0.86.2');
  fs.writeFileSync(
    path.join(reactNativeRoot, 'rn-get-polyfills.js'),
    'module.exports = () => [];'
  );
  createPackage(
    path.join(
      reactNativeRoot,
      'node_modules',
      '@react-native',
      'assets-registry'
    ),
    '@react-native/assets-registry',
    '0.86.2'
  );
  if (rootAssetsRegistryVersion) {
    createPackage(
      path.join(
        projectRoot,
        'node_modules',
        '@react-native',
        'assets-registry'
      ),
      '@react-native/assets-registry',
      rootAssetsRegistryVersion
    );
  }
  if (main === 'expo-router/entry') {
    const expoRouterRoot = path.join(
      projectRoot,
      'node_modules',
      'expo-router'
    );
    fs.mkdirSync(path.join(expoRouterRoot, 'build'), { recursive: true });
    fs.writeFileSync(
      path.join(expoRouterRoot, 'package.json'),
      JSON.stringify({
        exports: { './entry': './entry.js' },
        name: 'expo-router',
      })
    );
    fs.writeFileSync(
      path.join(expoRouterRoot, 'entry.js'),
      "require('@expo/metro-runtime');"
    );
    fs.writeFileSync(
      path.join(expoRouterRoot, 'build', 'qualified-entry.js'),
      'exports.App = function App() {};'
    );
    fs.writeFileSync(
      path.join(expoRouterRoot, 'build', 'renderRootComponent.js'),
      'exports.renderRootComponent = function renderRootComponent() {};'
    );
  } else {
    const entryPath = path.join(projectRoot, main);
    fs.mkdirSync(path.dirname(entryPath), { recursive: true });
    fs.writeFileSync(entryPath, 'module.exports = {};');
  }
  fs.mkdirSync(path.join(projectRoot, routerRoot), { recursive: true });
  return projectRoot;
}

function installModuleFederationEnhanced(projectRoot) {
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
}

function mockInternalRepackPlugin(plugin, observe = () => {}) {
  const createRepackPlugin = plugin.createRepackPlugin.bind(plugin);
  plugin.createRepackPlugin = (platform) => {
    const internalPlugin = createRepackPlugin(platform);
    const config = internalPlugin.config;
    internalPlugin.apply = (compiler) => {
      observe({ compiler, config, platform });
    };
    return internalPlugin;
  };
  return plugin;
}

function createUnitExpoPlugin(options, observe) {
  return mockInternalRepackPlugin(new ExpoPlugin(options), observe);
}

function expectedEntryImports(projectRoot, entry = 'index.js') {
  return [
    require.resolve('../dist/rspack/runtime/configureScriptManager.js'),
    fs.realpathSync(path.join(projectRoot, entry)),
  ];
}

function testMatchesFilename(test, filename) {
  if (test instanceof RegExp) {
    const lastIndex = test.lastIndex;
    test.lastIndex = 0;
    const matches = test.test(filename);
    test.lastIndex = lastIndex;
    return matches;
  }
  if (Array.isArray(test)) {
    return test.some((condition) => testMatchesFilename(condition, filename));
  }
  return typeof test === 'string' && filename.endsWith(test);
}

function flattenRules(rules) {
  return rules.flatMap((rule) => {
    if (typeof rule !== 'object' || rule === null) return [];
    return [
      rule,
      ...flattenRules([...(rule.oneOf ?? []), ...(rule.rules ?? [])]),
    ];
  });
}

function rulesForFilename(rules, filename) {
  return flattenRules(rules).filter((rule) =>
    testMatchesFilename(rule.test, filename)
  );
}

function ruleUse(rule) {
  const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
  return uses.find((use) => use && typeof use === 'object' && use.loader);
}

function createCompiler({
  mode = 'development',
  moduleRules = [],
  output = {},
  platform = 'ios',
  plugins,
  projectRoot = createProject(),
  resolve = {},
  rspack = true,
} = {}) {
  const compiler = {
    appliedDefinitions: [],
    context: projectRoot,
    options: {
      entry: {},
      externalsPresets: {},
      mode,
      module: {
        rules: moduleRules,
      },
      name: platform,
      output,
      plugins: plugins ?? [],
      resolve,
    },
    webpack: {
      DefinePlugin,
      ...(rspack ? { rspackVersion: '1.6.0' } : {}),
    },
  };

  return compiler;
}

test('configures a native Expo compilation and applies its internal RepackPlugin', () => {
  const appliedInternalPlugins = [];
  const expoPlugin = createUnitExpoPlugin(undefined, (application) => {
    appliedInternalPlugins.push(application);
  });
  const compiler = createCompiler({ plugins: [expoPlugin] });

  expoPlugin.apply(compiler);

  assert.deepEqual(compiler.options.entry, {
    main: {
      import: expectedEntryImports(compiler.context),
    },
  });
  const babelRules = rulesForFilename(compiler.options.module.rules, 'App.tsx');
  assert.equal(babelRules.length, 1);
  const use = ruleUse(babelRules[0]);
  assert.match(use.loader, /expoBabelLoader\.js$/);
  assert.deepEqual(use.options.caller, {
    asyncRoutes: false,
    baseUrl: '',
    bundler: 'repack',
    engine: 'hermes',
    isDev: true,
    isHMREnabled: false,
    isReactServer: false,
    isServer: false,
    name: '@callstack/repack-expo',
    platform: 'ios',
    preserveEnvVars: true,
    projectRoot: compiler.context,
    routerRoot: 'app',
    supportsStaticESM: true,
  });
  assert.deepEqual(compiler.appliedDefinitions, [
    { 'process.env.EXPO_OS': JSON.stringify('ios') },
  ]);
  assert.deepEqual(compiler.options.resolve.modules, [
    path.join(compiler.context, 'node_modules'),
    'node_modules',
  ]);
  assert.deepEqual(compiler.options.resolve.mainFields, [
    'react-native',
    'browser',
    'main',
  ]);
  assert.equal(compiler.options.output.chunkFilename, '[name].chunk.bundle');
  assert.equal(appliedInternalPlugins.length, 1);
  assert.equal(appliedInternalPlugins[0].compiler, compiler);
  assert.equal(appliedInternalPlugins[0].platform, 'ios');
});

test('prepends ScriptManager configuration before the resolved app entry', () => {
  const plugin = createUnitExpoPlugin();
  const compiler = createCompiler({ plugins: [plugin] });

  plugin.apply(compiler);

  const imports = compiler.options.entry.main.import;
  assert.match(imports[0], /runtime\/configureScriptManager\.js$/);
  assert.equal(
    imports[1],
    fs.realpathSync(path.join(compiler.context, 'index.js'))
  );
});

test('adds a Babel rule when module.rules is empty', () => {
  const plugin = createUnitExpoPlugin();
  const compiler = createCompiler({ plugins: [plugin] });

  plugin.apply(compiler);

  const babelRules = rulesForFilename(
    compiler.options.module.rules,
    'feature.native.tsx'
  );
  assert.equal(babelRules.length, 1);
  assert.equal(babelRules[0].type, 'javascript/auto');
  assert.match(ruleUse(babelRules[0]).loader, /expoBabelLoader\.js$/);
});

test('adapts an existing Babel rule without losing its options or adding a duplicate', () => {
  const existingRule = {
    exclude: /vendor/,
    test: /\.[jt]sx?$/,
    type: 'javascript/auto',
    use: {
      loader: '@callstack/repack/babel-loader',
      options: {
        caller: { custom: true },
        sourceMaps: false,
      },
    },
  };
  const plugin = createUnitExpoPlugin();
  const compiler = createCompiler({
    moduleRules: [existingRule],
    plugins: [plugin],
  });

  plugin.apply(compiler);

  const babelRules = rulesForFilename(compiler.options.module.rules, 'App.tsx');
  assert.equal(babelRules.length, 1);
  assert.equal(babelRules[0], existingRule);
  assert.equal(existingRule.type, 'javascript/auto');
  assert.equal(String(existingRule.exclude), String(/vendor/));
  const use = ruleUse(existingRule);
  assert.match(use.loader, /expoBabelLoader\.js$/);
  assert.equal(use.options.sourceMaps, false);
  assert.equal(use.options.caller.custom, true);
  assert.equal(use.options.caller.platform, 'ios');
});

test('defaults every extra chunk to local in its internal RepackPlugin', () => {
  let internalApplication;
  const plugin = createUnitExpoPlugin(undefined, (application) => {
    internalApplication = application;
  });
  const compiler = createCompiler({
    mode: 'production',
    platform: 'android',
    plugins: [plugin],
  });

  plugin.apply(compiler);

  assert.equal(internalApplication.platform, 'android');
  assert.equal(internalApplication.config.platform, 'android');
  assert.deepEqual(internalApplication.config.extraChunks, [{ type: 'local' }]);
  assert.equal(
    compiler.options.module.rules[0].use.options.caller.isDev,
    false
  );
});

test('rejects a nested RepackPlugin platform that conflicts with Expo', () => {
  const projectRoot = createProject();
  assert.throws(
    () =>
      rspack({
        context: projectRoot,
        entry: './ignored.js',
        mode: 'development',
        name: 'ios',
        output: { path: path.join(projectRoot, 'dist') },
        plugins: [
          new ExpoPlugin({
            platform: 'ios',
            repack: { platform: 'android' },
          }),
        ],
      }),
    (error) => {
      assert.equal(error instanceof ExpoPluginError, true);
      assert.equal(error.code, 'REPACK_PLATFORM_CONFLICT');
      assert.match(error.message, /android/);
      assert.match(error.message, /ios/);
      assert.match(error.recovery, /Remove repack\.platform/);
      return true;
    }
  );
});

test('normalizes missing and Rspack-default chunk filenames for packaged chunks', () => {
  for (const chunkFilename of [undefined, '[name].js']) {
    const plugin = createUnitExpoPlugin();
    const compiler = createCompiler({
      output: { chunkFilename },
      plugins: [plugin],
    });

    plugin.apply(compiler);

    assert.equal(compiler.options.output.chunkFilename, '[name].chunk.bundle');
  }
});

test('preserves an explicit flat chunk filename', () => {
  const plugin = createUnitExpoPlugin();
  const compiler = createCompiler({
    output: { chunkFilename: '[id].[contenthash].bundle' },
    plugins: [plugin],
  });

  plugin.apply(compiler);

  assert.equal(
    compiler.options.output.chunkFilename,
    '[id].[contenthash].bundle'
  );
});

test('rejects nested and dynamic chunk filenames', () => {
  for (const chunkFilename of [
    'chunks/[name].chunk.bundle',
    'chunks\\[name].chunk.bundle',
    () => '[name].chunk.bundle',
  ]) {
    const plugin = createUnitExpoPlugin();
    const compiler = createCompiler({
      output: { chunkFilename },
      plugins: [plugin],
    });

    assert.throws(
      () => plugin.apply(compiler),
      (error) => {
        assert.equal(error instanceof ExpoPluginError, true);
        assert.equal(error.code, 'INVALID_CHUNK_FILENAME');
        assert.match(error.recovery, /flat string/);
        return true;
      }
    );
  }
});

test('resolves React Native and its matching assets registry from the project runtime', () => {
  const projectRoot = createProject({ rootAssetsRegistryVersion: '0.84.1' });
  const plugin = createUnitExpoPlugin();
  const compiler = createCompiler({
    plugins: [plugin],
    projectRoot,
    resolve: {
      alias: { existing: '/existing/alias' },
      aliasFields: ['custom-alias'],
      byDependency: {
        esm: {
          conditionNames: ['custom-esm'],
          extensions: ['.custom-esm'],
        },
        url: { conditionNames: ['custom-url'] },
      },
      conditionNames: ['custom-condition'],
      exportsFields: ['custom-exports'],
      extensionAlias: {
        '.custom': ['.custom.native', '.custom'],
        '.png': ['.custom.png'],
      },
      extensions: ['.custom'],
      mainFields: ['custom-main'],
      modules: ['custom_modules'],
    },
  });

  plugin.apply(compiler);

  const reactNativeRoot = path.join(
    projectRoot,
    'node_modules',
    'react-native'
  );
  const matchingRegistryRoot = path.join(
    reactNativeRoot,
    'node_modules',
    '@react-native',
    'assets-registry'
  );
  const conflictingRegistryRoot = path.join(
    projectRoot,
    'node_modules',
    '@react-native',
    'assets-registry'
  );

  assert.equal(compiler.options.resolve.alias['react-native'], reactNativeRoot);
  assert.equal(
    compiler.options.resolve.alias['@react-native/assets-registry'],
    matchingRegistryRoot
  );
  assert.notEqual(
    compiler.options.resolve.alias['@react-native/assets-registry'],
    conflictingRegistryRoot
  );
  assert.equal(compiler.options.resolve.alias.existing, '/existing/alias');
  assert.deepEqual(compiler.options.resolve.modules, [
    path.join(projectRoot, 'node_modules'),
    'custom_modules',
  ]);
  assert.deepEqual(compiler.options.resolve.aliasFields, [
    'react-native',
    'browser',
    'main',
    'custom-alias',
  ]);
  assert.deepEqual(compiler.options.resolve.conditionNames, [
    'react-native',
    'custom-condition',
  ]);
  assert.deepEqual(compiler.options.resolve.exportsFields, [
    'exports',
    'custom-exports',
  ]);
  assert.deepEqual(compiler.options.resolve.extensions.slice(-1), ['.custom']);
  assert.deepEqual(compiler.options.resolve.mainFields, [
    'react-native',
    'browser',
    'main',
    'custom-main',
  ]);
  assert.deepEqual(compiler.options.resolve.extensionAlias['.png'], [
    '.custom.png',
  ]);
  assert.deepEqual(compiler.options.resolve.extensionAlias['.custom'], [
    '.custom.native',
    '.custom',
  ]);
  assert.deepEqual(compiler.options.resolve.byDependency.esm.conditionNames, [
    'react-native',
    'import',
    'custom-esm',
  ]);
  assert.deepEqual(compiler.options.resolve.byDependency.esm.extensions, [
    '.custom-esm',
  ]);
  assert.deepEqual(
    compiler.options.resolve.byDependency.commonjs.conditionNames,
    ['react-native', 'require']
  );
  assert.deepEqual(compiler.options.resolve.byDependency.url, {
    conditionNames: ['custom-url'],
  });
  assert.equal(
    JSON.parse(
      fs.readFileSync(path.join(matchingRegistryRoot, 'package.json'), 'utf8')
    ).version,
    '0.86.2'
  );
  assert.equal(
    JSON.parse(
      fs.readFileSync(
        path.join(conflictingRegistryRoot, 'package.json'),
        'utf8'
      )
    ).version,
    '0.84.1'
  );
});

test('adds standard image, font, and XML asset handling with the platform', () => {
  const plugin = createUnitExpoPlugin();
  const compiler = createCompiler({ plugins: [plugin] });

  plugin.apply(compiler);

  const pngRules = rulesForFilename(compiler.options.module.rules, 'asset.png');
  const fontRules = rulesForFilename(
    compiler.options.module.rules,
    'material.ttf'
  );
  const xmlRules = rulesForFilename(compiler.options.module.rules, 'asset.xml');
  assert.equal(pngRules.length, 1);
  assert.equal(fontRules.length, 1);
  assert.equal(xmlRules.length, 1);
  assert.equal(pngRules[0], fontRules[0]);
  for (const rule of [pngRules[0], xmlRules[0]]) {
    assert.equal(rule.type, 'javascript/auto');
    assert.match(ruleUse(rule).loader, /assetsLoader\/index\.js$/);
    assert.equal(ruleUse(rule).options.platform, 'ios');
  }
});

test('preserves existing asset rules and options while filling only missing extensions', () => {
  const pngRule = {
    test: /\.png$/,
    type: 'javascript/auto',
    use: {
      loader: '@callstack/repack/assets-loader',
      options: { inline: true },
    },
  };
  const xmlRule = { test: /\.xml$/, use: 'custom-xml-loader' };
  const unrelatedRule = {
    test: /\.txt$/,
    use: { loader: 'raw-loader', options: { encoding: 'utf8' } },
  };
  const plugin = createUnitExpoPlugin();
  const compiler = createCompiler({
    moduleRules: [pngRule, xmlRule, unrelatedRule],
    platform: 'android',
    plugins: [plugin],
  });

  plugin.apply(compiler);

  assert.deepEqual(rulesForFilename(compiler.options.module.rules, 'a.png'), [
    pngRule,
  ]);
  assert.deepEqual(rulesForFilename(compiler.options.module.rules, 'a.xml'), [
    xmlRule,
  ]);
  assert.equal(
    rulesForFilename(compiler.options.module.rules, 'font.otf').length,
    1
  );
  assert.deepEqual(ruleUse(pngRule).options, {
    inline: true,
    platform: 'android',
  });
  assert.equal(xmlRule.use, 'custom-xml-loader');
  assert.deepEqual(unrelatedRule.use, {
    loader: 'raw-loader',
    options: { encoding: 'utf8' },
  });
});

test('replaces the standard Router entry with a Metro-free bootstrap loader', () => {
  const projectRoot = createProject({ main: 'expo-router/entry' });
  const plugin = createUnitExpoPlugin();
  const compiler = createCompiler({
    plugins: [plugin],
    projectRoot,
  });

  plugin.apply(compiler);

  const entryPath = compiler.options.entry.main.import[1];
  const routerRule = compiler.options.module.rules.find(
    (rule) =>
      rule.enforce === 'pre' &&
      rule.test instanceof RegExp &&
      rule.test.test(entryPath)
  );
  assert.match(routerRule.use.loader, /expoRouterEntryLoader\.js$/);

  let cacheable = false;
  const source = expoRouterEntryLoader.call({
    cacheable(value) {
      cacheable = value;
    },
    resourcePath: entryPath,
  });
  assert.equal(cacheable, true);
  assert.match(source, /qualified-entry\.js/);
  assert.match(source, /renderRootComponent\.js/);
  assert.doesNotMatch(source, /@expo\/metro-runtime/);
});

test('rejects a separately configured RepackPlugin in either plugin order', () => {
  for (const expoFirst of [false, true]) {
    const expoPlugin = new ExpoPlugin();
    const repackPlugin = new RepackPlugin();
    const compiler = createCompiler({
      plugins: expoFirst
        ? [expoPlugin, repackPlugin]
        : [repackPlugin, expoPlugin],
    });

    assert.throws(
      () => expoPlugin.apply(compiler),
      (error) => {
        assert.equal(error instanceof ExpoPluginError, true);
        assert.equal(error.code, 'REPACK_PLUGIN_CONFLICT');
        assert.match(error.recovery, /Remove RepackPlugin/);
        return true;
      }
    );
  }
});

test('configures ExpoPlugin alone in a real Rspack compiler', () => {
  const projectRoot = createProject();
  const compiler = rspack({
    context: projectRoot,
    entry: './ignored.js',
    mode: 'development',
    name: 'ios',
    output: { path: path.join(projectRoot, 'dist') },
    plugins: [new ExpoPlugin()],
  });

  assert.deepEqual(compiler.options.entry, {
    main: {
      import: expectedEntryImports(projectRoot),
    },
  });
  const ruleUse = compiler.options.module.rules[0].use;
  const loader = Array.isArray(ruleUse) ? ruleUse[0].loader : ruleUse.loader;
  assert.match(loader, /expoBabelLoader\.js$/);
});

test('composes with the real Re.Pack ModuleFederationPluginV2 in either plugin order', () => {
  for (const expoFirst of [false, true]) {
    const projectRoot = createProject();
    installModuleFederationEnhanced(projectRoot);
    const expoPlugin = new ExpoPlugin({ repack: { logger: false } });
    const federationPlugin = new ModuleFederationPluginV2({
      dts: false,
      name: 'ExpoHost',
    });

    const compiler = rspack({
      context: projectRoot,
      entry: './ignored.js',
      mode: 'development',
      name: 'ios',
      output: { path: path.join(projectRoot, 'dist') },
      plugins: expoFirst
        ? [expoPlugin, federationPlugin]
        : [federationPlugin, expoPlugin],
    });

    assert.deepEqual(compiler.options.entry, {
      main: {
        import: expectedEntryImports(projectRoot),
      },
    });
  }
});

test('selects src/app when it exists and allows an in-project override', () => {
  const srcProject = createProject({ routerRoot: 'src/app' });
  const srcPlugin = createUnitExpoPlugin();
  const srcCompiler = createCompiler({
    plugins: [srcPlugin],
    projectRoot: srcProject,
  });
  srcPlugin.apply(srcCompiler);
  assert.equal(
    srcCompiler.options.module.rules[0].use.options.caller.routerRoot,
    'src/app'
  );

  const customProject = createProject({ routerRoot: 'src/screens' });
  const customPlugin = createUnitExpoPlugin({ routerRoot: 'src/screens' });
  const customCompiler = createCompiler({
    plugins: [customPlugin],
    projectRoot: customProject,
  });
  customPlugin.apply(customCompiler);
  assert.equal(
    customCompiler.options.module.rules[0].use.options.caller.routerRoot,
    'src/screens'
  );
});

test('discovers an Expo project above a nested Rspack context', () => {
  const projectRoot = createProject();
  const nestedContext = path.join(projectRoot, 'config', 'rspack');
  fs.mkdirSync(nestedContext, { recursive: true });
  const plugin = createUnitExpoPlugin();
  const compiler = createCompiler({
    plugins: [plugin],
    projectRoot: nestedContext,
  });

  plugin.apply(compiler);

  assert.equal(
    compiler.options.module.rules[0].use.options.caller.projectRoot,
    projectRoot
  );
  assert.deepEqual(compiler.options.entry, {
    main: {
      import: expectedEntryImports(projectRoot),
    },
  });
});

test('preserves metadata on the single configured Rspack entry', () => {
  const plugin = createUnitExpoPlugin();
  const compiler = createCompiler({ plugins: [plugin] });
  compiler.options.entry = {
    application: {
      filename: 'custom.bundle',
      import: ['./ignored.js'],
      runtime: 'native-runtime',
    },
  };

  plugin.apply(compiler);

  assert.deepEqual(compiler.options.entry, {
    application: {
      filename: 'custom.bundle',
      import: expectedEntryImports(compiler.context),
      runtime: 'native-runtime',
    },
  });
});

test('rejects ambiguous or dynamic Rspack entries', () => {
  for (const [entry, code] of [
    [
      { first: { import: ['./a'] }, second: { import: ['./b'] } },
      'AMBIGUOUS_ENTRY',
    ],
    [() => ({ main: { import: ['./index'] } }), 'DYNAMIC_ENTRY_UNSUPPORTED'],
  ]) {
    const plugin = createUnitExpoPlugin();
    const compiler = createCompiler({ plugins: [plugin] });
    compiler.options.entry = entry;

    assert.throws(
      () => plugin.apply(compiler),
      (error) => {
        assert.equal(error.code, code);
        assert.equal(typeof error.recovery, 'string');
        return true;
      }
    );
  }
});

test('adds isNodeModule per transformed resource inside package-local loaders', () => {
  const caller = { name: '@callstack/repack-expo' };

  assert.equal(
    withExpoBabelCaller(
      { caller },
      '/project/node_modules/expo-router/_ctx.ios.js'
    ).caller.isNodeModule,
    true
  );
  assert.equal(
    withExpoBabelCaller({ caller }, '/project/app/index.tsx').caller
      .isNodeModule,
    false
  );
});

test('clears the default Babel source root while preserving an explicit override', () => {
  assert.deepEqual(getExpoBabelLoaderOptions({ caller: { name: 'test' } }), {
    caller: { name: 'test', isNodeModule: false },
    sourceRoot: undefined,
  });
  assert.deepEqual(
    getExpoBabelLoaderOptions({
      caller: { name: 'test' },
      sourceRoot: '/custom/source/root',
    }),
    {
      caller: { name: 'test', isNodeModule: false },
      sourceRoot: '/custom/source/root',
    }
  );
});

test('adds the public environment transform and dotenv dependencies from a public-only snapshot', () => {
  const projectRoot = createProject();
  fs.writeFileSync(
    path.join(projectRoot, '.env.development'),
    [
      'EXPO_PUBLIC_VISIBLE=public-loader-value',
      'PRIVATE_TEST_SECRET=private-loader-value',
    ].join('\n')
  );
  const dependencies = [];
  const missingDependencies = [];

  const options = getExpoBabelLoaderOptions(
    {
      caller: {
        isDev: true,
        name: '@callstack/repack-expo',
        projectRoot,
      },
      expoPublicEnvironment: {
        digest: 'public-environment-digest',
        inline: true,
        values: { EXPO_PUBLIC_VISIBLE: 'public-loader-value' },
      },
    },
    { dependencies, missingDependencies }
  );

  assert.equal(options.plugins.length, 1);
  assert.match(options.plugins[0][0], /inlineExpoPublicEnvironment\.js$/);
  assert.deepEqual(options.plugins[0][1].environment, {
    EXPO_PUBLIC_VISIBLE: 'public-loader-value',
  });
  assert.deepEqual(dependencies, [path.join(projectRoot, '.env.development')]);
  assert.deepEqual(
    missingDependencies,
    ['.env.development.local', '.env.local', '.env'].map((filename) =>
      path.join(projectRoot, filename)
    )
  );
  assert.doesNotMatch(JSON.stringify(options), /private-loader-value/);
});

test('preserves production public environment accesses when client injection is disabled', () => {
  const options = getExpoBabelLoaderOptions({
    caller: {
      isDev: false,
      name: '@callstack/repack-expo',
      projectRoot: createProject(),
    },
    expoPublicEnvironment: {
      digest: 'disabled-environment-digest',
      inline: false,
      values: {},
    },
  });
  assert.equal(options.plugins, undefined);
});

test('fails fast for unsupported compiler configurations', () => {
  const cases = [
    {
      code: 'RSPACK_REQUIRED',
      compiler: createCompiler({
        rspack: false,
      }),
    },
    {
      code: 'UNSUPPORTED_PLATFORM',
      compiler: createCompiler({
        platform: 'web',
      }),
    },
    {
      code: 'UNSUPPORTED_ENVIRONMENT',
      compiler: createCompiler(),
      configure(compiler) {
        compiler.options.externalsPresets.node = true;
      },
    },
  ];

  for (const { code, compiler, configure } of cases) {
    configure?.(compiler);
    assert.throws(
      () => new ExpoPlugin().apply(compiler),
      (error) => {
        assert.equal(error instanceof ExpoPluginError, true);
        assert.equal(error.code, code);
        assert.equal(typeof error.recovery, 'string');
        return true;
      }
    );
  }
});

test('rejects a Router root outside the Expo project', () => {
  const plugin = new ExpoPlugin({ routerRoot: '../routes' });
  const compiler = createCompiler({ plugins: [plugin] });

  assert.throws(
    () => plugin.apply(compiler),
    (error) => {
      assert.equal(error.code, 'INVALID_ROUTER_ROOT');
      assert.match(error.recovery, /inside the Expo project/);
      return true;
    }
  );
});

// Smoke test of the built @callstack/repack package against the
// @rspack/core major installed in the surrounding fixture.
//
// Run by run.mjs with a fixture directory as cwd and
// RSPACK_COMPAT_EXPECTED_MAJOR set to the major the fixture pins.
// The script asserts the dual-major behavior matrix: config routing,
// legacy-cache warning, Node compatibility guard, and a full dev build
// with HMR + React Refresh wired from the correct source per major.
const fs = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');

const FIXTURE = process.cwd();
const fixtureRequire = createRequire(path.join(FIXTURE, 'package.json'));

const failures = [];

function report(name, ok, detail) {
  const status = ok ? 'PASS' : detail ? `FAIL (${detail})` : 'FAIL';
  console.log(`${name.padEnd(44)}: ${status}`);
  if (!ok) failures.push(name);
}

function majorOf(version) {
  return Number(version.split('.')[0]);
}

// --- 0. lane guard ---------------------------------------------------------
// The fixtures install repack from a packed tarball, like a real user
// project, precisely because in-workspace repack's own @rspack/core@^2
// devDependency shadows any v1 pin (bare imports resolve from
// packages/repack before the project's copy) - a workspace-linked fixture
// would silently test v2 twice. Verify all of it holds before asserting
// anything else, and abort loudly if it doesn't.

const expectedMajor = Number(process.env.RSPACK_COMPAT_EXPECTED_MAJOR);
if (!Number.isInteger(expectedMajor)) {
  console.error(
    'RSPACK_COMPAT_EXPECTED_MAJOR must be set - run this script via run.mjs'
  );
  process.exit(1);
}

const installedVersion = fixtureRequire('@rspack/core/package.json').version;
const repackPkgPath = fixtureRequire.resolve('@callstack/repack/package.json');
const REPACK = path.dirname(repackPkgPath);
const repackRequire = createRequire(repackPkgPath);
const versionSeenByRepack = repackRequire('@rspack/core/package.json').version;
const realRepackDir = fs.realpathSync(REPACK);
const fixtureModulesDir = fs.realpathSync(path.join(FIXTURE, 'node_modules'));
const tarballInstalled = realRepackDir.startsWith(fixtureModulesDir + path.sep);

console.log(
  `\nsmoke: @rspack/core ${installedVersion} (expected major ${expectedMajor})`
);

report(
  '0a. fixture installs the intended major',
  majorOf(installedVersion) === expectedMajor,
  `installed ${installedVersion}`
);
report(
  '0b. repack resolves the fixture rspack',
  majorOf(versionSeenByRepack) === expectedMajor,
  `repack sees ${versionSeenByRepack}`
);
report(
  '0c. repack is the tarball-installed copy',
  tarballInstalled,
  realRepackDir
);

if (failures.length > 0) {
  console.error(
    '\nLane guard failed - the fixture does not test what it claims to ' +
      'test. Aborting before running any behavior assertions.'
  );
  process.exit(1);
}

const major = expectedMajor;

(async () => {
  // --- 1. getRepackConfig routing ------------------------------------------
  const { getRepackConfig } = repackRequire(
    path.join(REPACK, 'dist/commands/common/config/getRepackConfig.js')
  );
  const repackConfig = await getRepackConfig('rspack', FIXTURE);
  const hasParallel = repackConfig.experiments?.parallelLoader === true;
  const exportsPresence =
    repackConfig.module?.parser?.javascript?.exportsPresence;
  if (major >= 2) {
    report('1a. no experiments.parallelLoader', !hasParallel);
    report(
      '1b. exportsPresence auto',
      exportsPresence === 'auto',
      `got ${exportsPresence}`
    );
  } else {
    report('1a. experiments.parallelLoader kept', hasParallel);
    report('1b. no module parser override', repackConfig.module === undefined);
  }

  // --- 2. cache accessor + legacy-cache warning (warn-only) -----------------
  const { getRspackCacheConfig } = repackRequire(
    path.join(REPACK, 'dist/commands/common/resetPersistentCache.js')
  );
  const { warnLegacyRspackCacheConfig } = repackRequire(
    path.join(REPACK, 'dist/commands/common/warnLegacyRspackCacheConfig.js')
  );
  const legacyCfg = {
    experiments: {
      cache: { type: 'persistent', storage: { directory: '/custom' } },
    },
  };
  report(
    '2a. accessor reads legacy location',
    getRspackCacheConfig(legacyCfg)?.storage?.directory === '/custom'
  );
  const warns = [];
  const origWarn = console.warn;
  console.warn = (msg) => warns.push(String(msg));
  warnLegacyRspackCacheConfig([legacyCfg]);
  warnLegacyRspackCacheConfig([legacyCfg]); // must warn only once
  console.warn = origWarn;
  const untouched =
    legacyCfg.cache === undefined &&
    legacyCfg.experiments.cache?.storage?.directory === '/custom';
  report(
    '2b. warns once, mutates nothing',
    warns.length === 1 && untouched,
    `warns=${warns.length} untouched=${untouched}`
  );
  report(
    '2c. accessor still reads legacy location',
    getRspackCacheConfig(legacyCfg)?.storage?.directory === '/custom'
  );

  // --- 3. node compatibility guard -------------------------------------------
  const { ensureNodeSupportsRspack } = repackRequire(
    path.join(REPACK, 'dist/commands/rspack/ensureNodeCompat.js')
  );
  try {
    ensureNodeSupportsRspack();
    report(`3.  node guard passes on ${process.versions.node}`, true);
  } catch (error) {
    report('3.  node guard passes', false, error.message);
  }

  // --- 4. dev build through DevelopmentPlugin (HMR + React Refresh) ---------
  const rspack = fixtureRequire('@rspack/core');
  const rspackFn = rspack.rspack ?? rspack;
  const { DevelopmentPlugin } = repackRequire(
    path.join(REPACK, 'dist/plugins/DevelopmentPlugin.js')
  );
  const OUT = path.join(FIXTURE, 'dist', 'smoke');

  const config = {
    context: FIXTURE,
    mode: 'development',
    devtool: false,
    entry: { main: './src/App.jsx' },
    devServer: { host: 'localhost', port: 8081, hot: true },
    output: {
      path: OUT,
      filename: 'index.bundle',
      uniqueName: 'smokeapp',
      clean: true,
    },
    module: {
      rules: [
        {
          // mirror Re.Pack's getJsTransformRules: 'javascript/auto' makes
          // ESM/CJS detection syntax-based instead of package-scope based
          type: 'javascript/auto',
          test: /\.[cm]?jsx?$/,
          use: {
            loader: 'builtin:swc-loader',
            options: { jsc: { parser: { syntax: 'ecmascript', jsx: true } } },
          },
        },
      ],
    },
    plugins: [new DevelopmentPlugin({ platform: 'ios' })],
  };

  const compiler = rspackFn(config);
  const stats = await new Promise((resolve, reject) => {
    compiler.run((error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

  const statsJson = stats.toJson({ all: false, errors: true });
  if (statsJson.errors?.length) {
    for (const error of statsJson.errors.slice(0, 3)) {
      console.error(
        'build error:',
        error.message.split('\n').slice(0, 2).join(' | ').slice(0, 200)
      );
    }
    report('4a. dev build with refresh + HMR', false, 'compilation errors');
  } else {
    await new Promise((resolve) => compiler.close(resolve));
    const out = fs.readFileSync(path.join(OUT, 'index.bundle'), 'utf8');
    const contentChecks = {
      'refresh entry bundled (__reactRefreshInjected)': out.includes(
        '__reactRefreshInjected'
      ),
      'repack loader footer applied (setImmediate)':
        out.includes('setImmediate'),
      'HMR client bundled':
        out.includes('[Re.Pack] HMR') ||
        out.includes('WebpackHMRClient') ||
        out.includes('__hmr'),
      'refresh utils wired ($RefreshReg$)': out.includes('$RefreshReg$'),
    };
    let bundleOk = true;
    for (const [name, ok] of Object.entries(contentChecks)) {
      if (!ok) {
        bundleOk = false;
        console.error('missing from bundle:', name);
      }
    }
    report('4a. dev build with refresh + HMR', bundleOk);

    // the refresh runtime must come from the correct source per major:
    // vendored client files (packages/repack/vendor/react-refresh) under
    // Rspack 1, the official @rspack/plugin-react-refresh under Rspack 2 -
    // with zero references to the other source
    const usedVendored =
      out.includes('vendor/react-refresh/reactRefresh.js') ||
      out.includes('vendor_react-refresh');
    const usedOfficial = out.includes('plugin-react-refresh/client/');
    const sourceOk =
      major >= 2
        ? usedOfficial && !usedVendored
        : usedVendored && !usedOfficial;
    report(
      '4b. refresh runtime source correct',
      sourceOk,
      `vendored=${usedVendored} official=${usedOfficial}, ` +
        `expected ${major >= 2 ? 'official plugin' : 'vendored files'}`
    );
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} assertion(s) failed`);
    process.exit(1);
  }
  console.log('\nall assertions passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

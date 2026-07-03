// Smoke test of built @callstack/repack dist against the rspack major
// installed in the current working directory.
//
// Provenance: verification artifact from the 2026-07-02 implementation
// session (docs 07/08). Run from inside a lab project (see README.md next to
// this file for the lab setup) with `node <path-to>/smoke.cjs`. Assertions
// 2a-2c match the warn-only cache behavior applied on the reference branch
// per maintainer feedback #5 (doc 10 §5).
const path = require('node:path');
const fs = require('node:fs');
const REPACK = path.resolve(__dirname, '../../..', 'packages/repack');
const LAB = process.cwd();
const rspackPkg = require(
  path.join(LAB, 'node_modules/@rspack/core/package.json')
);
const major = Number(rspackPkg.version.split('.')[0]);
console.log(
  `\n=== smoke @rspack/core ${rspackPkg.version} (major ${major}) ===`
);

(async () => {
  // --- 1. getRepackConfig ---
  const { getRepackConfig } = require(
    path.join(REPACK, 'dist/commands/common/config/getRepackConfig.js')
  );
  const repackConfig = await getRepackConfig('rspack', LAB);
  const hasParallel = repackConfig.experiments?.parallelLoader === true;
  const exportsPresence =
    repackConfig.module?.parser?.javascript?.exportsPresence;
  if (major >= 2) {
    console.log(
      '1a. no experiments.parallelLoader          :',
      !hasParallel ? 'PASS' : 'FAIL'
    );
    console.log(
      '1b. exportsPresence auto                   :',
      exportsPresence === 'auto' ? 'PASS' : 'FAIL: ' + exportsPresence
    );
  } else {
    console.log(
      '1a. experiments.parallelLoader kept        :',
      hasParallel ? 'PASS' : 'FAIL'
    );
    console.log(
      '1b. no module parser override              :',
      repackConfig.module === undefined ? 'PASS' : 'FAIL'
    );
  }

  // --- 2. cache config accessor + legacy-cache warning (warn-only, feedback #5) ---
  const { getRspackCacheConfig } = require(
    path.join(REPACK, 'dist/commands/common/resetPersistentCache.js')
  );
  const { warnLegacyRspackCacheConfig } = require(
    path.join(REPACK, 'dist/commands/common/warnLegacyRspackCacheConfig.js')
  );
  const legacyCfg = {
    experiments: {
      cache: { type: 'persistent', storage: { directory: '/custom' } },
    },
  };
  console.log(
    '2a. accessor reads legacy location         :',
    getRspackCacheConfig(legacyCfg)?.storage?.directory === '/custom'
      ? 'PASS'
      : 'FAIL'
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
  console.log(
    '2b. warns once, mutates nothing            :',
    warns.length === 1 && untouched
      ? 'PASS'
      : `FAIL (warns=${warns.length} untouched=${untouched})`
  );
  console.log(
    '2c. accessor still reads legacy location   :',
    getRspackCacheConfig(legacyCfg)?.storage?.directory === '/custom'
      ? 'PASS'
      : 'FAIL'
  );

  // --- 3. node compat guard ---
  const { ensureNodeSupportsRspack } = require(
    path.join(REPACK, 'dist/commands/rspack/ensureNodeCompat.js')
  );
  try {
    ensureNodeSupportsRspack();
    console.log(
      '3.  node guard passes on',
      process.versions.node,
      '      : PASS'
    );
  } catch (e) {
    console.log(
      '3.  node guard threw unexpectedly          : FAIL -',
      e.message
    );
  }

  // --- 4. DevelopmentPlugin end-to-end dev build with HMR + React Refresh ---
  const labRequire = require('node:module').createRequire(
    path.join(LAB, 'package.json')
  );
  const rspack = labRequire('@rspack/core');
  const rspackFn = rspack.rspack ?? rspack;
  const { DevelopmentPlugin } = require(
    path.join(REPACK, 'dist/plugins/DevelopmentPlugin.js')
  );
  const OUT = path.join(LAB, 'dist', 'smoke');

  const config = {
    context: LAB,
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
    resolve: {
      alias: {
        // stub react-native - the smoke test validates refresh wiring,
        // not RN itself (RN sources need the full flow/babel loader setup)
        'react-native': path.join(__dirname, 'rn-stub'),
      },
    },
    resolveLoader: {
      alias: {
        '@callstack/repack/react-refresh-loader': path.join(
          REPACK,
          'dist/loaders/reactRefreshLoader/index.js'
        ),
      },
    },
    plugins: [new DevelopmentPlugin({ platform: 'ios' })],
  };

  const compiler = rspackFn(config);
  await new Promise((resolve) => {
    compiler.run((err, stats) => {
      if (err) {
        console.log(
          '4.  DevelopmentPlugin build                : FAIL -',
          err.message.split('\n')[0]
        );
        return resolve();
      }
      const j = stats.toJson({ all: false, errors: true });
      if (j.errors?.length) {
        console.log('4.  DevelopmentPlugin build                : FAIL');
        for (const e of j.errors.slice(0, 3))
          console.log(
            '    err:',
            e.message.split('\n').slice(0, 2).join(' | ').slice(0, 200)
          );
        return resolve();
      }
      compiler.close(() => {
        const out = fs.readFileSync(path.join(OUT, 'index.bundle'), 'utf8');
        const checks = {
          'refresh entry bundled (__reactRefreshInjected)': out.includes(
            '__reactRefreshInjected'
          ),
          'repack loader footer applied (setImmediate)':
            out.includes('setImmediate'),
          'HMR client bundled':
            out.includes('[Re.Pack] HMR') ||
            out.includes('WebpackHMRClient') ||
            out.includes('__hmr'),
          'refresh utils wired ($ReactRefreshRuntime$)':
            out.includes('$RefreshReg$'),
        };
        let pass = true;
        for (const [name, ok] of Object.entries(checks)) {
          if (!ok) {
            pass = false;
            console.log('    missing:', name);
          }
        }
        const usedVendored =
          out.includes('vendor/react-refresh/reactRefresh.js') ||
          out.includes('vendor_react-refresh');
        const usedOfficial = out.includes('plugin-react-refresh/client/');
        const sourceOk =
          major >= 2
            ? usedOfficial && !usedVendored
            : usedVendored && !usedOfficial;
        console.log(
          '4a. dev build with refresh + HMR           :',
          pass ? 'PASS' : 'FAIL'
        );
        console.log(
          '4b. refresh runtime source correct         :',
          sourceOk
            ? `PASS (${major >= 2 ? 'official plugin' : 'vendored files'})`
            : `FAIL (vendored=${usedVendored} official=${usedOfficial})`
        );
        resolve();
      });
    });
  });
})();

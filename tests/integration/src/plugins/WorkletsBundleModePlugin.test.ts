import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import {
  detectWorkletsBundleMode,
  ReanimatedPlugin,
  WorkletsBundleModePlugin,
} from '@callstack/repack-plugin-reanimated';
import type { Configuration } from '@rspack/core';
import { createFsFromVolume, Volume } from 'memfs';
import { describe, expect, it } from 'vitest';
import { createCompiler } from '../helpers.js';

const requireFromModule = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '__fixtures__', 'worklets-bundle-mode');
/** A minimal RN app whose Babel config turns Bundle Mode on. */
const PROJECT = path.join(FIXTURES, 'project');
const WORKLETS_ENTRY_MODULE =
  './node_modules/react-native-worklets/src/index.ts';
const WORKLETS_POLYFILL_MODULE =
  './node_modules/react-native-worklets/bundleMode/polyfills/prepareBundleMode.js';
/** The two checked-in `.worklets/<hash>.js` fixtures, by the hash in their file name. */
const EAGER_WORKLET = 10110358253470;
const LAZY_WORKLET = 10110358253471;

// `__RUNTIME_KIND` values Worklets uses: 1 is the React Native Runtime, anything else is
// a Worklet Runtime.
const RN_RUNTIME = 1;
const UI_RUNTIME = 2;

/**
 * The app's own JS rule, pointing the Worklets Babel plugin at the fixture package.
 * Bundle Mode only turns on because that rule transforms the files holding the flag, so
 * the tests compile through a real loader rather than pre-transformed sources.
 */
const workletsTransformRule: NonNullable<Configuration['module']>['rules'] = [
  {
    test: /\.[cm]?[jt]sx?$/,
    use: {
      loader: requireFromModule.resolve(
        '@callstack/repack-plugin-reanimated/loader'
      ),
      options: {
        babelPlugins: [
          [
            path.join(PROJECT, 'node_modules/react-native-worklets/plugin'),
            { bundleMode: true },
          ],
        ],
      },
    },
  },
];

interface CompileOptions {
  plugins?: Configuration['plugins'];
  /** `[]` for no rules of the caller's own, e.g. when the plugin adds its own. */
  rules?: NonNullable<Configuration['module']>['rules'];
  mainFields?: string[];
  optimization?: Configuration['optimization'];
}

/**
 * Compiles the fixture project and returns every emitted asset next to the compilation
 * warnings, which is what the placement and collision assertions read.
 */
async function compileFixture({
  plugins = [],
  rules = workletsTransformRule,
  mainFields = ['react-native', 'main'],
  optimization,
}: CompileOptions = {}) {
  const compiler = await createCompiler({
    context: PROJECT,
    mode: 'development',
    devtool: false,
    entry: './index.js',
    output: { path: '/out', filename: 'main.js', publicPath: 'static/' },
    resolve: { mainFields, extensions: ['.js', '.ts'] },
    // Keeps module ids readable and identical across the two bundlers.
    optimization: { moduleIds: 'named', ...optimization },
    module: { rules },
    plugins,
  });

  const volume = new Volume();
  const fileSystem = createFsFromVolume(volume);
  // @ts-expect-error memfs is compatible enough with the output filesystem
  compiler.outputFileSystem = fileSystem;

  const stats: any = await new Promise((resolve, reject) => {
    compiler.run((error, compilationStats) => {
      if (error) {
        reject(error);
        return;
      }
      if (compilationStats?.hasErrors()) {
        reject(new Error(compilationStats.toString({ errors: true })));
        return;
      }
      resolve(compilationStats);
    });
  });

  const assets: Record<string, string> = {};
  for (const asset of Object.keys(stats.compilation.assets)) {
    assets[asset] = fileSystem.readFileSync(
      path.join('/out', asset),
      'utf-8'
    ) as string;
  }

  const warnings: string[] = stats.compilation.warnings.map((warning: any) =>
    String(warning.message ?? warning).replace(/\s+/g, ' ')
  );

  return { assets, code: assets['main.js'], warnings };
}

const bundleModePlugin = () =>
  new WorkletsBundleModePlugin({ context: PROJECT });

/** The `webpack/runtime/worklets/bundleMode` section appended to the entry chunk. */
function getWorkletsRuntimeSection(code: string) {
  const start = code.indexOf('runtime/worklets/bundleMode');
  expect(
    start,
    'expected a worklets/bundleMode runtime section'
  ).toBeGreaterThan(-1);
  const end = code.indexOf('})();', start);
  return code.slice(start, end === -1 ? undefined : end);
}

function getWorkletsModuleIds(code: string): Record<string, string> {
  const match = getWorkletsRuntimeSection(code).match(
    /var __workletsModuleIds = (\{[^}]*\});/
  );
  expect(match, 'expected a __workletsModuleIds map').not.toBeNull();
  return JSON.parse(match![1]);
}

/** The bundler module id native reaches Worklets through. */
function getEntryModuleId(code: string) {
  return getWorkletsModuleIds(code)['-2'];
}

/** Whether a chunk defines the worklet with this hash rather than only requiring it. */
function definesWorklet(code: string, hash: number) {
  return code.includes(`workletHash = ${hash}`);
}

interface Runtime {
  context: any;
  prepareBundleModeCalls: number;
}

/**
 * Evaluates an emitted bundle the way a JSI runtime would: as a plain script, behind the
 * globals native sets before it. Webpack's chunk loader reads `self`, hence the alias.
 */
function evaluateAsRuntime(code: string, runtimeKind: number): Runtime {
  const state = { prepareBundleModeCalls: 0 };
  const context: any = createContext({
    // The proxy Worklets' native side exposes on a Worklet Runtime, which the shim
    // forwards to under React Native's legacy lookup name.
    __workletsModuleProxy: { __tag: 'workletsModuleProxy' },
    __turboModuleProxy: (name: string) => ({
      __name: name,
      prepareBundleMode: () => {
        state.prepareBundleModeCalls += 1;
      },
    }),
  });
  context.self = context;
  context.__RUNTIME_KIND = runtimeKind;
  runInContext(code, context);
  return { context, ...state };
}

/** Calls a worklet namespace the way `__r` hands it to Worklets. */
function runWorklet(namespace: any, ...closures: unknown[]) {
  expect(namespace.default, 'expected a worklet factory').toBeTypeOf(
    'function'
  );
  return namespace.default(closures);
}

describe('WorkletsBundleModePlugin', () => {
  it('reads Bundle Mode from the project Babel config', () => {
    // The fixture configures the Worklets plugin with `bundleMode: true`.
    expect(detectWorkletsBundleMode(PROJECT)).toBe(true);
    // A project without that plugin in its Babel config must read as off, and a project
    // with no Babel config at all must not throw.
    expect(detectWorkletsBundleMode(path.resolve(FIXTURES, '..'))).toBe(false);
  });

  describe('the runtime module', () => {
    it('emits the __r shim Worklets native code drives the bundle through', async () => {
      const { assets, code } = await compileFixture({
        plugins: [bundleModePlugin()],
      });
      const section = getWorkletsRuntimeSection(code);

      // The runtime module is registered for entry chunks only, so a split chunk gets no
      // shim of its own.
      expect(assets['lazy_js.main.js']).not.toContain('worklets/bundleMode');

      expect(section).toContain('var __isWorkletRuntime =');
      expect(section).toContain(
        'globalThis.__RUNTIME_KIND !== undefined && globalThis.__RUNTIME_KIND !== 1'
      );
      expect(section).toContain('globalThis.__r = function (id) {');
      expect(section).toContain('var moduleId = __workletsModuleIds[id];');
      expect(section).toContain(
        "throw new Error('[Worklets] Could not resolve module with id ' + id + ' on a Worklet Runtime.');"
      );
      expect(section).toContain('return __webpack_require__(moduleId);');

      // Metro defers requires to the call site and this bundler hoists them, so the
      // legacy module lookup has to stand in for one that would die on a Worklet Runtime.
      expect(section).toContain('globalThis.nativeModuleProxy === undefined');
      expect(section).toContain(
        '__workletsModuleProxy: globalThis.__workletsModuleProxy'
      );

      // The app itself must not boot on a Worklet Runtime.
      expect(section).toContain('void __originalStartup;');
    });

    it('requires the Bundle Mode polyfill from the runtime module', async () => {
      const { code } = await compileFixture({ plugins: [bundleModePlugin()] });
      const section = getWorkletsRuntimeSection(code);

      // Required by id rather than through the map, ahead of the Worklet Runtime branch.
      const required = section.match(
        /__webpack_require__\(("(?:[^"\\]|\\.)*prepareBundleMode\.js")\);/
      );
      expect(required, 'expected the polyfill to be required').not.toBeNull();
      expect(JSON.parse(required![1])).toBe(WORKLETS_POLYFILL_MODULE);
      expect(Object.values(getWorkletsModuleIds(code))).not.toContain(
        WORKLETS_POLYFILL_MODULE
      );
    });

    it('enables Bundle Mode and warms the UI Runtime on the RN Runtime', async () => {
      const { code } = await compileFixture({ plugins: [bundleModePlugin()] });
      const runtime = evaluateAsRuntime(code, RN_RUNTIME);

      expect(runtime.context.__WORKLETS_POLYFILL_EVALUATED__).toBe(1);
      expect(runtime.context._WORKLETS_BUNDLE_MODE_ENABLED).toBe(true);
      // Only the RN Runtime asks native to start preparing the UI Runtime.
      expect(runtime.prepareBundleModeCalls).toBe(1);
    });

    it('keeps the app from starting on a Worklet Runtime', async () => {
      const { code } = await compileFixture({ plugins: [bundleModePlugin()] });
      const runtime = evaluateAsRuntime(code, UI_RUNTIME);

      // The polyfill runs on every runtime - native needs Bundle Mode on all of them -
      // but preparing yet another runtime is not this runtime's job.
      expect(runtime.context.__WORKLETS_POLYFILL_EVALUATED__).toBe(1);
      expect(runtime.prepareBundleModeCalls).toBe(0);
      // Startup is a no-op, so neither the app entry nor Worklets is evaluated here.
      expect(runtime.context.__APP_ENTRY__).toBeUndefined();
      expect(runtime.context.__WORKLETS_ENTRY_EVALUATED__).toBeUndefined();
      expect(runtime.context.__r).toBeTypeOf('function');
    });

    it('leaves the RN Runtime booting the app as usual', async () => {
      const { code } = await compileFixture({ plugins: [bundleModePlugin()] });
      const runtime = evaluateAsRuntime(code, RN_RUNTIME);

      expect(runtime.context.__APP_ENTRY__).toBe(true);
      expect(runtime.context.__WORKLETS_ENTRY_EVALUATED__).toBe(1);
      // Bundle Mode is on before any app code runs, which is what disarms the guards the
      // app's first worklet call would otherwise hit.
      expect(runtime.context.__FLAG_AT_APP_ENTRY__).toBe(true);
      // `__r` belongs to Worklet Runtimes only; installing it here would shadow RN's own.
      expect(runtime.context.__r).toBeUndefined();
      expect(runtime.context.nativeModuleProxy).toBeUndefined();
    });

    it('stands in for the legacy native module lookup on a Worklet Runtime', async () => {
      const { code } = await compileFixture({ plugins: [bundleModePlugin()] });
      const runtime = evaluateAsRuntime(code, UI_RUNTIME);

      expect(Object.keys(runtime.context.nativeModuleProxy)).toEqual([
        '__workletsModuleProxy',
      ]);
      expect(runtime.context.nativeModuleProxy.__workletsModuleProxy).toEqual({
        __tag: 'workletsModuleProxy',
      });
    });
  });

  describe('the module id map', () => {
    it('maps the reserved id -2 to the Worklets entry point', async () => {
      const { code } = await compileFixture({ plugins: [bundleModePlugin()] });

      expect(getEntryModuleId(code)).toBe(WORKLETS_ENTRY_MODULE);

      // Native's boot sequence: `__r(-2)` evaluates Worklets on a Worklet Runtime.
      const runtime = evaluateAsRuntime(code, UI_RUNTIME);
      expect(runtime.context.__r(-2).__FIXTURE__).toBe(
        'react-native-worklets-src-entry'
      );
      expect(runtime.context.__WORKLETS_ENTRY_EVALUATED__).toBe(1);
    });

    it('maps each worklet hash to the module holding its factory', async () => {
      const { code } = await compileFixture({ plugins: [bundleModePlugin()] });

      expect(getWorkletsModuleIds(code)[String(EAGER_WORKLET)]).toBe(
        `./node_modules/react-native-worklets/.worklets/${EAGER_WORKLET}.js`
      );

      // The id native requires is the hash in the generated file name, and it comes back
      // as the factory for that worklet.
      const runtime = evaluateAsRuntime(code, UI_RUNTIME);
      const worklet = runWorklet(runtime.context.__r(EAGER_WORKLET), 'hello');
      expect(worklet.__workletHash).toBe(EAGER_WORKLET);
    });

    it('reports unknown ids the way Worklets does', async () => {
      const { code } = await compileFixture({ plugins: [bundleModePlugin()] });
      const runtime = evaluateAsRuntime(code, UI_RUNTIME);

      expect(() => runtime.context.__r(4242)).toThrow(
        '[Worklets] Could not resolve module with id 4242 on a Worklet Runtime.'
      );
    });

    it('gives the reserved id to the module the alias points at', async () => {
      // `mainFields: ['main']` sends the app's own imports to `lib/module/index.js` while
      // the alias keeps requesting `src/index.ts`, so both variants reach the entry chunk
      // and compete for `-2`.
      const { code, warnings } = await compileFixture({
        plugins: [bundleModePlugin()],
        mainFields: ['main'],
      });

      expect(getEntryModuleId(code)).toBe(WORKLETS_ENTRY_MODULE);

      const runtime = evaluateAsRuntime(code, UI_RUNTIME);
      expect(runtime.context.__r(-2).__FIXTURE__).toBe(
        'react-native-worklets-src-entry'
      );

      // The loser stays unreachable through `-2`, which is worth a warning.
      expect(
        warnings.find((warning) =>
          warning.includes('claim the Worklets entry point id')
        )
      ).toContain('lib/module/index.js');
    });
  });

  describe('cache-group placement', () => {
    it('pulls a worklet split away by a dynamic import into the entry chunk', async () => {
      const { assets, code } = await compileFixture({
        plugins: [bundleModePlugin()],
      });

      // The split chunk still exists, but the worklet lives in the entry chunk.
      expect(assets['lazy_js.main.js']).toBeDefined();
      expect(definesWorklet(assets['lazy_js.main.js'], LAZY_WORKLET)).toBe(
        false
      );
      expect(definesWorklet(code, LAZY_WORKLET)).toBe(true);

      // A Worklet Runtime only evaluates the entry chunk, so the split-away worklet has
      // to be reachable through `__r` regardless.
      expect(getWorkletsModuleIds(code)[String(LAZY_WORKLET)]).toBe(
        `./node_modules/react-native-worklets/.worklets/${LAZY_WORKLET}.js`
      );
      const runtime = evaluateAsRuntime(code, UI_RUNTIME);
      expect(
        runWorklet(runtime.context.__r(LAZY_WORKLET), 'lazy').__workletHash
      ).toBe(LAZY_WORKLET);
    });

    it('leaves that worklet in the split chunk without the plugin', async () => {
      // Control for the assertion above: same sources, no cache group to move it.
      const { assets, code } = await compileFixture();

      expect(definesWorklet(assets['lazy_js.main.js'], LAZY_WORKLET)).toBe(
        true
      );
      expect(definesWorklet(code, LAZY_WORKLET)).toBe(false);
    });

    it('names worklets left outside the entry chunk in a warning', async () => {
      // `splitChunks: false` is where the cache group deliberately does nothing, so the
      // diagnostic is the only thing telling the developer the worklet is unreachable.
      const { warnings } = await compileFixture({
        plugins: [bundleModePlugin()],
        optimization: { splitChunks: false },
      });

      const warning = warnings.find((entry) =>
        entry.includes('worklet module(s) ended up outside the main chunk')
      );
      expect(warning).toContain(String(LAZY_WORKLET));
      expect(warning).toContain('dynamic import');
    });
  });

  it('flips Bundle Mode in every file the app transforms', async () => {
    const { code } = await compileFixture({ plugins: [bundleModePlugin()] });
    const runtime = evaluateAsRuntime(code, RN_RUNTIME);

    // Both files holding the compile-time flag are flipped. If the app's JS rule excluded
    // node_modules, native would drive a bundle whose guards all stay armed.
    expect(code.match(/_WORKLETS_BUNDLE_MODE_ENABLED\s*=\s*false/g)).toBeNull();
    expect(runtime.context._WORKLETS_BUNDLE_MODE_ENABLED).toBe(true);
  });

  describe('through ReanimatedPlugin', () => {
    it('sets up Bundle Mode from the Babel config alone', async () => {
      // Nothing Bundle Mode related is configured on the plugin itself, and its own rules
      // do the workletizing: `getBabelPluginOptions` has to inject `bundleMode: true` into
      // the Worklets plugin, or the flag this path flips would stay false.
      const { code } = await compileFixture({
        plugins: [new ReanimatedPlugin()],
        rules: [],
      });

      expect(getEntryModuleId(code)).toBe(WORKLETS_ENTRY_MODULE);
      expect(getWorkletsModuleIds(code)[String(EAGER_WORKLET)]).toContain(
        `.worklets/${EAGER_WORKLET}.js`
      );
      expect(
        evaluateAsRuntime(code, RN_RUNTIME).context
          ._WORKLETS_BUNDLE_MODE_ENABLED
      ).toBe(true);
    });
  });
});

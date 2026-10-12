# Worklets Bundle Mode Support — Technical Design

`@callstack/repack-plugin-reanimated` makes a single webpack/Rspack-emitted
chunk work as both the React Native bundle and the Worklets Bundle Mode entry
bundle, so `react-native-worklets` can drive its own module system on the UI
and Worker runtimes.

Scope: compile-time flag, bundling changes, and the runtime bridge. It does
not change how worklets are written.

References are to `packages/plugin-reanimated/src` unless noted, by symbol name
rather than line number.

## The problem Bundle Mode creates for a non-Metro bundler

In Metro, Bundle Mode is driven by Worklets' **native** side:

```cpp
// react-native-worklets/Common/cpp/worklets/WorkletRuntime/ScriptLoader.h
static constexpr auto kRequireName_ = "__r";
static constexpr auto kWorkletsEntryPointId_ = -2;
// loadWorkletsEntryPoint(): __r(-2)
```

The same JS bundle is evaluated on several JSI runtimes (RN runtime, UI
runtime, each worker). On the worklet runtimes native calls `globalThis.__r(-2)`
to boot Worklets and `__r(<workletHash>)` to require individual worklet
factories (`SharedItems/Serializable/SerializableImport.cpp`).

Webpack and Rspack have no `__r` at all — they use `__webpack_require__` with
string module ids. So the bundle Re.Pack emits is not something Worklets'
native code can drive, and the cross-runtime functions stay armed as guarded
stubs (`addNoBundleModeGuardImplementation(scheduleOnUI)` in
`react-native-worklets/lib/module/threads.native.js`). Calling them from a
custom runtime throws — which is exactly the path the tester app exercises.

Support is therefore three things: a detection step, a bundling step that puts
the right modules in the right chunk, and a runtime bridge that reconciles the
two id spaces. Both the Babel flag and the bundler setup are mandatory: the
Babel flag alone leaves native unable to drive the bundle; the bundler setup
alone leaves `globalThis._WORKLETS_BUNDLE_MODE_ENABLED === false`, so every
guard stays armed.

## The Babel config is the source of truth

Nothing is configured through the Re.Pack plugin. The project turns Bundle Mode
on where Worklets itself does it:

```js
// apps/tester-app/babel.config.js
['react-native-worklets/plugin', { bundleMode: true, strictGlobal: true }]
```

That flag does two things inside the Worklets Babel plugin:

1. **`toggleBundleMode`** flips the literal `false` to `true` in exactly five
   files: `src/index.ts`, `src/debug/bundleMode.native.ts`,
   `lib/module/index.js`, `lib/module/debug/bundleMode.native.js`, and
   `bundleMode/polyfills/prepareBundleMode.js`. Every *read* of
   `globalThis._WORKLETS_BUNDLE_MODE_ENABLED` stays a runtime check. This is
   compile-time work, so it only happens because those files are themselves
   transformed — the app's JS rule has no `node_modules` exclude
   (`apps/tester-app/webpack.config.mjs`).
2. **Workletization**: every worklet is hoisted to
   `react-native-worklets/.worklets/<hash>.js` as a factory module. This is
   what turns a worklet hash into a node in the bundler's dependency graph,
   which the runtime bridge later relies on.

`strictGlobal` is an independent plugin flag and plays no part in this design.

The tester app also moves to `react-native-worklets@0.13.0` /
`react-native-reanimated@4.7.1` (plus `Podfile.lock`), the range with the
Bundle Mode runtime.

## Detection — `detectWorkletsBundleMode` (`bundleMode.ts`)

Reads the project's real Babel config from the compiler context with
`babel.loadPartialConfig()` and matches any plugin whose `name` **or**
`file.request` hits `/(react-native-worklets.[\\/]plugin|babel-plugin-worklets)/`
with `options.bundleMode === true`.

`loadPartialConfig` rather than `loadOptions` is deliberate: after full
resolution the plugin is only identified by the name it returns (`"worklets"`),
which says nothing about where it came from, so the raw request is the only
usable signal. Any failure returns `false` — the feature is opt-in by Babel
config and cannot desync from a duplicated Re.Pack option.

## Gating in `ReanimatedPlugin` (`plugin.ts`)

```
bundleMode && reanimatedVersion.major < 4  -> warn, ignore
bundleMode                                 -> new WorkletsBundleModePlugin({ context }).apply(compiler)
```

`getBabelPluginOptions(bundleMode)` injects `bundleMode: true` into
`babelPluginOptions` **only when the user did not set it**. Apps that let the
plugin's own loader workletize (`unstable_disableTransform: false`, the default)
then transform worklets the same way as the `babel.config.js` path does.
Without this, worklet artifacts emitted in non-bundle-mode shape would land in
a bundle native believes is bundle-mode.

## Resolve aliases (`bundleMode.ts`)

| Alias | Target | Why |
| --- | --- | --- |
| `react-native-worklets/.worklets` | `<workletsRoot>/.worklets` | those files are generated *during* the transform; aliasing avoids depending on the bundler discovering the directory |
| `@callstack/repack-plugin-reanimated/worklets-entry` | the first existing `src/index.ts` / `lib/module/index.js` | the module holding the flipped flag — the id native calls `-2` |
| `@callstack/repack-plugin-reanimated/worklets-polyfill` | `react-native-worklets/bundleMode/polyfills/prepareBundleMode.js` | must be present in the bundle to run first |

They are aliased to absolute paths **inside the worklets package**, so the
app's JS rule still matches them and the Babel plugin still flips the flag.
`WORKLETS_ENTRY_PATHS` accepts both `src/index.ts` and `lib/module/index.js`,
because which file gets bundled depends on whether the `react-native` resolve
condition wins. The alias targets the first of them that exists, which is also
the order `getWorkletsEntryRank` ranks them in — the same preference decides
both, so the module the alias requests is the module that owns `-2`.

Existing user aliases are spread last, so they keep precedence.

## One owner for the reserved `-2` (`selectWorkletsEntry`)

Both entry variants can land in the same entry chunk: the alias always requests
one of them, while the app's own `react-native-worklets` imports resolve to
whichever file its conditions prefer. Writing the map in chunk order would let
that order pick the winner, so `generate` collects every candidate
(`collectWorkletsEntryCandidates`) and `selectWorkletsEntry` ranks them by
`WORKLETS_ENTRY_PATHS` position, path as tie-break, before writing any key. The
top-ranked module gets `-2`, every other entry variant is skipped, and
`warnAboutWorkletsOutsideMainChunk` raises the same collision from the same
selection so the losers are named in a compilation warning.

## Getting the modules into the graph without executing them (`bundleModeInclude.ts`)

On `entryOption` (`before: 'RepackNativeEntryPlugin'`, `stage: -100`, so it
also runs for Module Federation containers) an extra entry module is added per
entry chunk:

```ts
require.resolve('@callstack/repack-plugin-reanimated/worklets-entry');
require.resolve('@callstack/repack-plugin-reanimated/worklets-polyfill');
```

`require.resolve` makes each request part of the module graph without running
the module. The entry chunk must *contain* both, but Worklets' `init()` and the
polyfill must fire at a precisely controlled moment on each runtime, so the
runtime module does the actual `require` instead — mirroring where Metro places
that polyfill. Dynamic (function) entry throws.

`bundleModeInclude.ts` compiles to `dist/bundleModeInclude.js` and is located
with `require.resolve('./bundleModeInclude.js')`, the same pattern as Re.Pack's
own `modules/IncludeModules.js`.

## Pinning every Worklets module to the main chunk (`bundleMode.ts`)

Worklet runtimes only ever evaluate the main bundle — there is no chunk loader
there. A cache group pulls Worklets and all `.worklets/<hash>.js` files into
main regardless of who imports them:

```js
{
  test: resource => resource.includes('/react-native-worklets/'),
  name: entryChunkName,          // first entry chunk, else 'main'
  chunks: () => true,
  priority: 100000,              // above the built-in vendors/default groups
  enforce: true,
}
```

No-op when `optimization.splitChunks === false` (nothing to protect), and
skipped if the group already exists.

## The runtime module — the actual bridge (`makeRuntimeModule`)

Registered per chunk from `additionalTreeRuntimeRequirements`, entry chunks
only, at `RuntimeModule.STAGE_TRIGGER` (20 — after Re.Pack's
`repack/polyfills` module, which runs at `STAGE_BASIC`). It adds the `require`
and `startup` runtime requirements. Emitted code, in execution order on every
runtime that evaluates the chunk:

1. `__workletsModuleIds = { -2: <id>, <hash>: <id>, ... }` — built by scanning
   the entry chunk's modules with `getWorkletsModuleId`, after
   `selectWorkletsEntry` has decided which module owns `-2`. This *is* the
   translation from Worklets' numeric id space to the bundler's string ids.
2. `__isWorkletRuntime = globalThis.__RUNTIME_KIND !== undefined && !== 1`
   (RN = 1, UI = 2, Worker = 3; `undefined` means web/Jest).
3. `__webpack_require__(<polyfill id>)` — unconditional and first. It enables
   Bundle Mode and, on the RN runtime, calls native
   `WorkletsModule.prepareBundleMode()` to start warming the UI runtime with
   this same bundle. Throws at build time if the polyfill is not in the entry
   chunk.
4. **Only on a Worklet Runtime:**
   - `globalThis.__r = function (id) { ... __webpack_require__(__workletsModuleIds[id]) }`
     — the Metro-shaped loader native expects, with Worklets-shaped errors for
     unknown ids.
   - `globalThis.nativeModuleProxy = { __workletsModuleProxy }` when absent —
     stands in for RN's legacy module lookup, which on a worklet runtime dies
     with `__fbBatchedBridgeConfig is not set`. Needed because the bundler
     **hoists** imports while Metro defers requires to the call site, so a
     runtime-guarded TurboModule import that Metro never reaches *is* reached
     here.
   - the startup function is replaced with a no-op (`void __originalStartup;
     return undefined`) — React, the React Native runtime and the app entry
     belong to the RN Runtime only. On a worklet runtime only `__r(-2)` runs.

One emitted chunk is thus simultaneously a valid RN bundle and a valid Worklets
entry bundle. That is what makes `scheduleOnUI(...)` legal from inside
`scheduleOnRuntime(createWorkletRuntime('test'), ...)`.

### Emitted shape

```js
// keys are strings: JSON.stringify of the map Worklets addresses numerically
var __workletsModuleIds = { "-2": "1234", "8273201484440": "5678" };
var __isWorkletRuntime =
  globalThis.__RUNTIME_KIND !== undefined && globalThis.__RUNTIME_KIND !== 1;
__webpack_require__(9012); // prepareBundleMode polyfill
if (__isWorkletRuntime) {
  globalThis.__r = function (id) {
    var moduleId = __workletsModuleIds[id];
    if (moduleId === undefined) {
      throw new Error('[Worklets] Could not resolve module with id ' + id + ' on a Worklet Runtime.');
    }
    return __webpack_require__(moduleId);
  };
  if (globalThis.nativeModuleProxy === undefined) {
    globalThis.nativeModuleProxy = {
      __workletsModuleProxy: globalThis.__workletsModuleProxy,
    };
  }
  var __originalStartup = __webpack_require__.x;
  __webpack_require__.x = function () {
    void __originalStartup;
    return undefined;
  };
}
```

The generated names (`__workletsModuleIds`, `__isWorkletRuntime`,
`__originalStartup`) are plain `var`s in the runtime chunk's IIFE and are not
referenced by any other runtime module; `__r` and `nativeModuleProxy` are
globals by requirement, because that is the name Worklets' native side reads.

## Diagnostics for the cases that cannot be fixed (`warnAboutWorkletsOutsideMainChunk`)

At `processAssets(PROCESS_ASSETS_STAGE_ANALYSE)`, every module outside an entry
chunk is checked with `getWorkletsModuleId`. Any stray worklet pushes a
compilation warning listing the first 10 hashes and telling the developer to
remove the dynamic import isolating it. The cache group covers Worklets' own
modules, but *app* worklets behind an `import()` can still be split away — this
makes that visible instead of failing at runtime.

The same pass reports any entry chunk where more than one module claims `-2`:
the id goes to the module the alias points at, and a warning names the modules
left unreachable through it.

## Webpack and Rspack compatibility

The runtime-module class is created per compiler by `makeRuntimeModule(compiler,
workletsRoot)` from `compiler.webpack`, so the same source works on both.
`RuntimeGlobals.startup` is optional in older webpack, hence the
`?? require + '.x'` fallback.

## Public surface (`index.ts`)

`WorkletsBundleModePlugin` and `detectWorkletsBundleMode` are exported
standalone, for setups that already workletize elsewhere and run the plugin
with `unstable_disableTransform: true` — e.g. the tester app's Rspack config,
which workletizes in `@callstack/repack/babel-swc-loader`.

## Validation surface

`apps/tester-app/src/reanimated/ReanimatedBox.tsx` is the manual probe:

```ts
scheduleOnRuntime(createWorkletRuntime('test'), () => {
  'worklet';
  try {
    scheduleOnUI(() => {
      'worklet';
      scheduleOnRN(showAlert, 'Bundle Mode works!');
    });
  } catch (error) {
    scheduleOnRN(showAlert, `Bundle Mode failed: ${String(error)}`);
  }
});
```

Without Bundle Mode the outer worklet runs and `scheduleOnUI` is the guard stub,
so the failure alert fires. With Bundle Mode the inner worklet executes on the
UI runtime and hops back to the JS thread through `scheduleOnRN`.

## Known limitations

- **No automated coverage.** `packages/plugin-reanimated/src/__tests__` does not
  exist; the tester app button is the only verification, and the checked-in
  `apps/tester-app/build/generated/**` bundles predate the change. A
  compile-time test asserting the `__r` shim, the `-2` mapping and the
  cache-group placement from a fixture build is the cheap next step.
- **Single entry chunk for the id map.**
  `WorkletsBundleModeRuntimeModule.generate` builds `__workletsModuleIds` from
  `this.chunk`, and `addWorkletsCacheGroup` pins Worklets to
  `entryChunkNames[0]`. Multi-entry projects (native-stack screens, custom
  Re.Pack entries) therefore get the Worklets modules and the id map in the
  first entry chunk only, and a second entry's worklet runtime resolves nothing.
  The tester app uses a single `main` entry, so this is latent rather than
  active. Either key the map per entry chunk or warn on multi-entry setups.
- **Generated worklets always live in the Worklets package.** Both the cache
  group and `getWorkletsModuleId` key off `/react-native-worklets/` in the
  resource path, which holds because the Babel plugin writes every
  `.worklets/<hash>.js` under `<workletsRoot>/.worklets` no matter where the
  worklet was authored. A fork or a custom transform emitting worklets
  elsewhere would be invisible to both the cache group and the id map. The
  aliases pin `.worklets`, the entry and the polyfill to
  `resolveWorkletsRoot(compiler.context)`, i.e. how the *app* resolves
  `react-native-worklets`; the Worklets Babel plugin resolves the same package
  from its own location, so a monorepo where those two land on different copies
  would alias one copy's files onto another's.
- **No worklets version check.** Bundle Mode needs `WorkletsModule.prepareBundleMode`
  and the native ScriptLoader, so only worklets versions shipping it work. The
  gate covers Reanimated's major; a worklets too old to ship the polyfill fails
  later, as an unresolved `…/worklets-polyfill` request rather than a message
  naming the version floor.

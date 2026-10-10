# Rspack 2 Support (Re.Pack 6) — Technical Design

Re.Pack 6 supports `@rspack/core` 2 only (peer `>=2`). There is no runtime
branching on the Rspack major: options Rspack 2 renamed or moved are mapped
directly, and the Rspack 1 workarounds are gone. webpack support is
unchanged.

An earlier revision of this design kept Rspack 1 working next to Rspack 2
(runtime major detection, a Node guard, lazy command loading, a two-tier
legacy-cache warning, a React Refresh restructure). Re.Pack 6 already
requires Node `>=22.12`, which meets Rspack 2's floor, and dropping Rspack 1
removed the need for the rest.

## Loading the ESM-only core

`@rspack/core@2` is pure ESM. Re.Pack's compiled CJS keeps loading it with a
plain `require`/`import` through Node's `require(esm)`, which every Node
version Re.Pack 6 supports has. Rspack 2 uses the `module.exports` interop
convention, so CJS consumers get the same shape as with v1.

## Config generation

- `getRepackConfig` no longer emits `experiments.parallelLoader`, which
  Rspack 2 removed. Parallel loading is opted into per rule with
  `use[].parallel`, as the templates already do. The babel-swc-loader's
  "parallelLoader enabled but rule not parallel" warning, and its
  `hideParallelModeWarning` option, were removed with it.
- `getRepackConfig` sets `module.parser.javascript.exportsPresence: 'auto'`
  for Rspack. Rspack 2 changed the default to `'error'`, which fails builds
  on missing-export imports that React Native itself ships (for example
  `React.unstable_Activity` in `renderApplication.js`). Users can override
  it.
- `REPACK_EXPERIMENTAL_CACHE` sets top-level `cache: { type: 'persistent' }`.
  Rspack 2 moved the cache config there from `experiments.cache` and
  silently ignores the old key.
- The Rspack minimizer is always Terser. The SWC minimizer special case for
  Rspack 1.4.11 was removed.

## Persistent cache reset

`resetPersistentCache` reads top-level `cache` for both bundlers and derives
the directory from whichever shape is set: Rspack `storage.directory`,
`cacheLocation`/`cacheDirectory` for `type: 'filesystem'` (webpack, or
Rspack with `experiments.newCache`), or the bundler's default
`node_modules/.cache/<bundler>`.

## Loaders

- Rspack 2 passes parallel loaders a correct `rootContext` and a
  `_compiler.rspack` with `experiments.swc`, so the babel-swc-loader uses
  them directly. The `rootContext === context` workaround and the
  `@rspack/core` resolution fallback were removed; webpack still falls back
  to `@swc/core` from the project.
- `assetsLoader` reads through small promise wrappers typed against
  Rspack's `InputFileSystem`. `util.promisify` picks the wrong overload of
  the v2 `readdir`/`readFile` types.

## Source maps

Rspack 2 builds `absoluteResourcePath` by joining the context and the
relative path without resolving it (`<context>/../../node_modules/...`).
`SourceMapPlugin` normalizes it for the absolute source names it emits
without a dev server. The dev server names (`[projectRoot^N]/...`) are
derived from `resourcePath` and are unaffected.

Rspack 2 also percent-encodes the resource path of the Module Federation
runtime `data:` module. `@callstack/repack-expo`'s source map fix matches the
encoded form when it renames that source to
`webpack://module-federation/virtual-runtime-<hash>.js`.

## Stats

Rspack 2's `stats.toJson()` leaves out assets, chunks, chunk groups,
entrypoints and modules unless asked for, even with `preset: 'normal'`.
`normalizeStatsOptions` falls back to requesting them explicitly when the
project has no stats config, so `bundle --json` writes the same shape as
before. Any preset or stats config the user sets is passed through as is.

## Profiling

Published Rspack 2 binaries don't include the perfetto trace layer, so
`RSPACK_PROFILE` defaults to `RSPACK_TRACE_LAYER=logger`. There is a single
profile handler; the pre-1.4 one was removed.

## React Refresh

Unchanged. The pinned `@rspack/plugin-react-refresh@1.0.0` has no
`@rspack/core` dependency, and `DevelopmentPlugin` keeps using its
`deprecated_runtimePaths`.

## Types

- `SwcLoaderOptions` is a union on `detectSyntax`. The babel-swc-loader works
  on a non-union `SwcConfig` (`detectSyntax?: false` with a full `jsc`),
  since it always sets `jsc.parser` itself.
- `compiler.options.devServer` is `false | DevServer`, narrowed before
  reading `hot`.

## Testing

- Jest can't load the ESM-only core inside its sandbox.
  `packages/repack/jest.environment.js` imports it outside the sandbox and
  `jest.rspack-core-bridge.js` maps `@rspack/core` onto it.
- Integration snapshots and markers follow Rspack 2's output: runtime
  module banners are `// repack/polyfills` instead of
  `// webpack/runtime/repack/polyfills`, and module factories use method
  shorthand. With MF v2, the polyfills runtime module now comes before
  `embed_federation_runtime`. MF still initializes inside
  `__webpack_require__.x()`, after the polyfills.

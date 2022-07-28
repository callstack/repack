# @callstack/repack

## 3.0.0-next.6

### Patch Changes

- [#209](https://github.com/callstack/repack/pull/209) [`ecf7829`](https://github.com/callstack/repack/commit/ecf78293def2150f960873eda9a7d25a61908b5c) Thanks [@zamotany](https://github.com/zamotany)! - ### Fix `importModule` crashing the app

  Prevent `importModule` from crashing with _cannot read property \_\_isInitialized of undefined_.

* [#207](https://github.com/callstack/repack/pull/207) [`4e15c38`](https://github.com/callstack/repack/commit/4e15c380fc2ff9aad1f300e5960e14d67557f6ce) Thanks [@jbinda](https://github.com/jbinda)! - ### Fix bi-directional imports in Module Federation

  `Federated.createRemote` and `Federated.importModule` now load and evaluate each container only once to support bi-directional
  container imports and cycling dependencies.

## 3.0.0-next.5

### Minor Changes

- [#202](https://github.com/callstack/repack/pull/202) [`fa097f7`](https://github.com/callstack/repack/commit/fa097f7a089221c11a60d8137368bf0e83f38230) Thanks [@zamotany](https://github.com/zamotany)! - ### ScriptManager

  - Added ability to provide multiple resolvers to `ScriptManager` using `ScriptManager.shared.addResolver`.
  - Removed `ScriptManager.configure` and split the functionality into `ScriptManager.shared.setStore` and `ScriptManager.shared.addResolver`.
  - Added methods to remove a single resolver and to remove all resolver.
  - Returning `undefined` from a resolver will cause next resolver in line to be used (as long as other resolver were added), if no resolver processed the request the error is thrown.

  Example:

  ```js
  ScriptManager.shared.setStorage(AsyncStorage);
  ScriptManager.shared.addResolver(async (scriptId, caller) => {
    /* ... */
  });
  ```

## 3.0.0-next.4

### Patch Changes

- [#198](https://github.com/callstack/repack/pull/198) [`96a6b27`](https://github.com/callstack/repack/commit/96a6b2711c93973569c170a181a0c808724fb8ca) Thanks [@ScriptedAlchemy](https://github.com/ScriptedAlchemy)! - ### Module Federation

  Keep track of initialized remote containers to prevent performance degradation and crashes.

- Updated dependencies [[`c75cdc7`](https://github.com/callstack/repack/commit/c75cdc7a44351bb4702232e603031e2880f2839d)]:
  - @callstack/repack-dev-server@1.0.0-next.2

## 3.0.0-next.3

### Minor Changes

- [#160](https://github.com/callstack/repack/pull/160) [`b088203`](https://github.com/callstack/repack/commit/b08820302e7eadfb38a3d0be24a1ed79ad458dfa) Thanks [@TMaszko](https://github.com/TMaszko)! - ### Assets loader

  By default, `@callstack/repack/assets-loader` will extract assets - meaning, they will be put in dedicated files and bundled together with the application.

  Inlined assets, however, are encoded as `base64` string into a data URI. Inlined assets are stored inside the actual JavaScript bundle - no dedicated files will be emitted
  for them.

  - Add `inline: boolean` option to `@callstack/repack/assets-loader`.
  - Add support for calculating `width`, `height` and `scale` for inlined assets.
  - Add support for inlining multiple scales.

## 3.0.0-next.2

### Minor Changes

- ### Development server API

  Added implementation for API functionalities in `@callstack/repack-dev-server`:

  - `GET /api/platforms` - List all platforms with active compilations
  - `GET /api/:platform/assets` - List all assets (`name` and `size`) for a given compilation
  - `GET /api/:platform/stats` - Get Webpack compilation stats
  - Websocket server under `/api` URI for logs and compilations events

### Patch Changes

- Updated dependencies []:
  - @callstack/repack-dev-server@1.0.0-next.1

## 3.0.0-next.1

### Patch Changes

- ### HMR

  - Upgraded `@pmmmwh/react-refresh-webpack-plugin` to `0.5.7` and added `react-refresh@^0.14.0` as a `@callstack/repack` dependency.
  - `RepackTargetPlugin` now requires to pass `hmr?: boolean` property to a constructor - only relevant, if you're **not** using `RepackPlugin`.

## 3.0.0-next.0

### Major Changes

- ### `ScriptManager`

  Refactored `ChunkManager` into `ScriptManager`:

  - `ChunkManager.configure(...)` got replaced with `new ScriptManager(...)`
  - Config option `resolveRemoteChunks` was renamed to `resolve`
  - Config option `forceRemoteChunkResolution` was removed - all resolution goes through `resolve`, regardless of the type
  - `ChunkManager.loadChunk` was renamed to `ScriptManager.loadScript`
  - `ChunkManager.preloadChunk` was renamed to `ScriptManager.prefetchScript`
  - `ChunkManager.invalidateChunks` was renamed to `ScriptManager.invalidateScripts`
  - Converted `ScriptManager` to be an Event Emitter with the following events:
    - `loading`
    - `loaded`
    - `resolving`
    - `resolved`
    - `prefetching`
    - `error`
  - Native module name - `ChunkManager` was renamed to `ScriptManager`
  - Added utilities for writing `resolve` implementation:
    - `Script.getDevSeverURL(scriptId)`
    - `Script.getRemoteURL(url)`
    - `Script.getFileSystemURL(scriptId)`
  - `chunkId` and `parentChunkId` were replaced by `scriptId` and `caller`

  ### Webpack config improvements

  - All Repack plugins are consolidated under single `RepackPlugin`, all sub-plugins are available under `plugins`:

    ```ts
    import * as Repack from "@callstack/repack";

    new Repack.plugins.AssetResolverPlugin();
    ```

  - Added support for CJS and ESM versions of Webpack config.
  - Added CJS and ESM templates for Webpack config.

  Default Webpack config lookup paths:

  - `webpack.config.mjs`
  - `webpack.config.cjs`
  - `webpack.config.js`
  - `.webpack/webpack.config.mjs`
  - `.webpack/webpack.config.cjs`
  - `.webpack/webpack.config.js`
  - `.webpack/webpackfile`

  ### CLI

  - Added `--silent` option to `webpack-start` command to silent all logs.
  - Added `--log-file <path>` option to `webpack-start` command to log all messages to a file.
  - Added `--json` `webpack-start` command to log all messages as JSON.

### Patch Changes

- Updated dependencies []:
  - @callstack/repack-dev-server@1.0.0-next.0

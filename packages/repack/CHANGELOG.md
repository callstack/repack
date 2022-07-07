# @callstack/repack

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

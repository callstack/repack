---
"@callstack/repack": major
---

### `ScriptManager`

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
  import * as Repack from '@callstack/repack';

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
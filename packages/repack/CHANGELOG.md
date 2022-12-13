# @callstack/repack

## 3.0.1

### Patch Changes

#### Windows related issues:

- Fix for path formatting on Windows platform breaking `assetsCache` in development Compiler

  - [#256](https://github.com/callstack/repack/pull/256) [`7348b56`](https://github.com/callstack/repack/commit/7348b5628158e11c617e4499095fd108a3740a03) Thanks [@meypod](https://github.com/meypod)! - Fix assetsCache miss on Windows
  - [#276](https://github.com/callstack/repack/pull/276) [`a15e881`](https://github.com/callstack/repack/commit/a15e8816c640c6627ef3ebb5a9d18b58f7178c6f) Thanks [@RafikiTiki](https://github.com/RafikiTiki)! - Fix: assetsCache not available on Windows platform due to problem with path encoding
- [#255](https://github.com/callstack/repack/pull/255) [`d974069`](https://github.com/callstack/repack/commit/d974069ab2e7abee2a4b7103a8a86fe476fc122a) Thanks [@meypod](https://github.com/meypod)! - Fix v3 `debugger-app` not working on Windows platform

#### Quality of life improvements:

- [#252](https://github.com/callstack/repack/pull/252) [`c654c87`](https://github.com/callstack/repack/commit/c654c877a080cb6226b10da26b0aa55a2360198b) Thanks [@jbinda](https://github.com/jbinda)! - Exit with non-zero exit code if compilation has errors

- [#268](https://github.com/callstack/repack/pull/268) [`aeebc70`](https://github.com/callstack/repack/commit/aeebc703cd0a2c102b85241d5180d7577a2899c5) Thanks [@robik](https://github.com/robik)! - Raise an error on missing native module

## 3.0.0

### Major Changes

- [#186](https://github.com/callstack/repack/pull/186) [`05d126e`](https://github.com/callstack/repack/commit/05d126e63802f0702a9e353e762f8b6a77fcd73e) Thanks [@zamotany](https://github.com/zamotany)! - ### `ScriptManager`

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

* [#237](https://github.com/callstack/repack/pull/237) [`9960a7b`](https://github.com/callstack/repack/commit/9960a7b5a39c4cb4caed4fc365a72f5ac3329e60) Thanks [@jbinda](https://github.com/jbinda)! - Expose `--reverse-port` argument in start command to fix dev server on Android

- [#189](https://github.com/callstack/repack/pull/189) [`bc42023`](https://github.com/callstack/repack/commit/bc420236687047752cf1ee42204b2f510aec144a) Thanks [@zamotany](https://github.com/zamotany)! - ### Development server API

  Added implementation for API functionalities in `@callstack/repack-dev-server`:

  - `GET /api/platforms` - List all platforms with active compilations
  - `GET /api/:platform/assets` - List all assets (`name` and `size`) for a given compilation
  - `GET /api/:platform/stats` - Get Webpack compilation stats
  - Websocket server under `/api` URI for logs and compilations events

* [#160](https://github.com/callstack/repack/pull/160) [`b088203`](https://github.com/callstack/repack/commit/b08820302e7eadfb38a3d0be24a1ed79ad458dfa) Thanks [@TMaszko](https://github.com/TMaszko)! - ### Assets loader

  By default, `@callstack/repack/assets-loader` will extract assets - meaning, they will be put in dedicated files and bundled together with the application.

  Inlined assets, however, are encoded as `base64` string into a data URI. Inlined assets are stored inside the actual JavaScript bundle - no dedicated files will be emitted
  for them.

  - Add `inline: boolean` option to `@callstack/repack/assets-loader`.
  - Add support for calculating `width`, `height` and `scale` for inlined assets.
  - Add support for inlining multiple scales.

- [#211](https://github.com/callstack/repack/pull/211) [`b588690`](https://github.com/callstack/repack/commit/b588690f3da905944abbe2da1fb5a8633bec9a43) Thanks [@zamotany](https://github.com/zamotany)! - **Custom Module Federation plugin - `Repack.plugins.ModuleFederationPlugin`**

  Add custom `ModuleFederationPlugin` plugin with defaults for React Native, automatic `remotes`
  conversion to `promise new Promise` (via `Federated.createRemote`) and support for `remote@location` syntax.

  For example, instead of using `webpack.container.ModuleFederationPlugin`, you can now use:

  ```js
  import * as Repack from "@callstack/repack";

  new Repack.plugins.ModuleFederationPlugin({
    name: "host"
  });

  new Repack.plugins.ModuleFederationPlugin({
    name: "app1",
    remotes: {
      module1: "module1@https://example.com/module1.container.bundle"
    }
  });

  new Repack.plugins.ModuleFederationPlugin({
    name: "app2",
    remotes: {
      module1: "module1@https://example.com/module1.container.bundle",
      module2: "module1@dynamic"
    }
  });
  ```

  **Priority for resolvers in `ScriptManager`**

  To support `remote@location` in `Repack.plugins.ModuleFederationPlugin`/`Federated.createRemote`, when adding
  a resolver using `ScriptManager.shared.addResolver` you can optionally specify priority of that resolver.
  By default all resolvers have priority of `2`.

  When using `remote@location` syntax with valid URL as `location` (eg `module1@https://example.com/module1.container.bundle`), a default resolver for the container and it's chunks will be added with priority `0`.
  If you want to overwrite it, add new resolver with higher priority.

  To specify custom priority use 2nd options argument:

  ```js
  import { ScriptManager } from "@callstack/repack/client";

  ScriptManager.shared.addResolver(
    async (scriptId, caller) => {
      // ...
    },
    { priority: 1 }
  ); // Default priority is `2`.
  ```

### Patch Changes

- [#198](https://github.com/callstack/repack/pull/198) [`96a6b27`](https://github.com/callstack/repack/commit/96a6b2711c93973569c170a181a0c808724fb8ca) Thanks [@ScriptedAlchemy](https://github.com/ScriptedAlchemy)! - ### Module Federation

  Keep track of initialized remote containers to prevent performance degradation and crashes.

* [#233](https://github.com/callstack/repack/pull/233) [`4bfeab1`](https://github.com/callstack/repack/commit/4bfeab131e3c3bca17a3b27247953d2c7adbd965) Thanks [@jbinda](https://github.com/jbinda)! - Pass `SHARE_ENV` to Worker to keep process envs from parent process

- [#188](https://github.com/callstack/repack/pull/188) [`78ae409`](https://github.com/callstack/repack/commit/78ae409c7ab281bd2ba2c581e7b21a7971992d24) Thanks [@zamotany](https://github.com/zamotany)! - ### HMR

  - Upgraded `@pmmmwh/react-refresh-webpack-plugin` to `0.5.7` and added `react-refresh@^0.14.0` as a `@callstack/repack` dependency.
  - `RepackTargetPlugin` now requires to pass `hmr?: boolean` property to a constructor - only relevant, if you're **not** using `RepackPlugin`.

* [#209](https://github.com/callstack/repack/pull/209) [`ecf7829`](https://github.com/callstack/repack/commit/ecf78293def2150f960873eda9a7d25a61908b5c) Thanks [@zamotany](https://github.com/zamotany)! - ### Fix `importModule` crashing the app

  Prevent `importModule` from crashing with _cannot read property \_\_isInitialized of undefined_.

- [#207](https://github.com/callstack/repack/pull/207) [`4e15c38`](https://github.com/callstack/repack/commit/4e15c380fc2ff9aad1f300e5960e14d67557f6ce) Thanks [@jbinda](https://github.com/jbinda)! - ### Fix bi-directional imports in Module Federation

  `Federated.createRemote` and `Federated.importModule` now load and evaluate each container only once to support bi-directional
  container imports and cycling dependencies.

- Updated dependencies [[`bc42023`](https://github.com/callstack/repack/commit/bc420236687047752cf1ee42204b2f510aec144a), [`e6dc69d`](https://github.com/callstack/repack/commit/e6dc69d35f287af08d09944edd8e6d12f28484cf), [`b913b89`](https://github.com/callstack/repack/commit/b913b8981334854cc13076af2a9c8a12bc465d1b), [`05d126e`](https://github.com/callstack/repack/commit/05d126e63802f0702a9e353e762f8b6a77fcd73e), [`6d65156`](https://github.com/callstack/repack/commit/6d65156366bc88edefdae7a3d0310ddbcdf48886), [`c75cdc7`](https://github.com/callstack/repack/commit/c75cdc7a44351bb4702232e603031e2880f2839d)]:
  - @callstack/repack-dev-server@1.0.0

## 3.0.0-next.8

### Minor Changes

- [#237](https://github.com/callstack/repack/pull/237) [`9960a7b`](https://github.com/callstack/repack/commit/9960a7b5a39c4cb4caed4fc365a72f5ac3329e60) Thanks [@jbinda](https://github.com/jbinda)! - Expose `--reverse-port` argument in start command to fix dev server on Android

### Patch Changes

- [#233](https://github.com/callstack/repack/pull/233) [`4bfeab1`](https://github.com/callstack/repack/commit/4bfeab131e3c3bca17a3b27247953d2c7adbd965) Thanks [@jbinda](https://github.com/jbinda)! - Pass `SHARE_ENV` to Worker to keep process envs from parent process

- Updated dependencies [[`e6dc69d`](https://github.com/callstack/repack/commit/e6dc69d35f287af08d09944edd8e6d12f28484cf), [`b913b89`](https://github.com/callstack/repack/commit/b913b8981334854cc13076af2a9c8a12bc465d1b), [`6d65156`](https://github.com/callstack/repack/commit/6d65156366bc88edefdae7a3d0310ddbcdf48886)]:
  - @callstack/repack-dev-server@1.0.0-next.3

## 3.0.0-next.7

### Minor Changes

- [#211](https://github.com/callstack/repack/pull/211) [`b588690`](https://github.com/callstack/repack/commit/b588690f3da905944abbe2da1fb5a8633bec9a43) Thanks [@zamotany](https://github.com/zamotany)! - **Custom Module Federation plugin - `Repack.plugins.ModuleFederationPlugin`**

  Add custom `ModuleFederationPlugin` plugin with defaults for React Native, automatic `remotes`
  conversion to `promise new Promise` (via `Federated.createRemote`) and support for `remote@location` syntax.

  For example, instead of using `webpack.container.ModuleFederationPlugin`, you can now use:

  ```js
  import * as Repack from "@callstack/repack";

  new Repack.plugins.ModuleFederationPlugin({
    name: "host"
  });

  new Repack.plugins.ModuleFederationPlugin({
    name: "app1",
    remotes: {
      module1: "module1@https://example.com/module1.container.bundle"
    }
  });

  new Repack.plugins.ModuleFederationPlugin({
    name: "app2",
    remotes: {
      module1: "module1@https://example.com/module1.container.bundle",
      module2: "module1@dynamic"
    }
  });
  ```

  **Priority for resolvers in `ScriptManager`**

  To support `remote@location` in `Repack.plugins.ModuleFederationPlugin`/`Federated.createRemote`, when adding
  a resolver using `ScriptManager.shared.addResolver` you can optionally specify priority of that resolver.
  By default all resolvers have priority of `2`.

  When using `remote@location` syntax with valid URL as `location` (eg `module1@https://example.com/module1.container.bundle`), a default resolver for the container and it's chunks will be added with priority `0`.
  If you want to overwrite it, add new resolver with higher priority.

  To specify custom priority use 2nd options argument:

  ```js
  import { ScriptManager } from "@callstack/repack/client";

  ScriptManager.shared.addResolver(
    async (scriptId, caller) => {
      // ...
    },
    { priority: 1 }
  ); // Default priority is `2`.
  ```

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

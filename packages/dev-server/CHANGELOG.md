# @callstack/repack-dev-server

## 5.0.0-alpha.0

## 4.3.3

## 4.3.2

## 4.3.1

## 4.3.0

## 4.2.0

## 4.1.1

## 4.1.0

## 4.0.0

### Major Changes

- [#430](https://github.com/callstack/repack/pull/430) [`0d96b11`](https://github.com/callstack/repack/commit/0d96b11ff3a6e2c21eb622e21ff7947db29a3272) Thanks [@jbroma](https://github.com/jbroma)! - Upgrade to Node 18, drop support for Node 16

- [#508](https://github.com/callstack/repack/pull/508) [`fec8962`](https://github.com/callstack/repack/commit/fec8962b45f3d744d7c41e8f6eeae0a2310c7693) Thanks [@RafikiTiki](https://github.com/RafikiTiki)! - - Fixed deprecated remote debugger integration:
  - Removed vendored code and used middlewares from `@react-native-community/cli-server-api`
  - Removed `package/debugger-app` and replaced it with `@react-native-community/cli-debugger-ui`
  - Removed vendored code responsible for integration with Flipper debugger & custom implementation of the Hermes Inspector Proxy
  - Added integration with `@react-native/dev-middleware` which enables us to use both Flipper and new experimental debugger

### Patch Changes

- [#567](https://github.com/callstack/repack/pull/567) [`6417da7`](https://github.com/callstack/repack/commit/6417da7ba72e39602735062198165c998e4e19cf) Thanks [@kerm1it](https://github.com/kerm1it)! - Notify clients on all platforms when sending an HMR event update

- [#554](https://github.com/callstack/repack/pull/554) [`ed82e29`](https://github.com/callstack/repack/commit/ed82e29c2871411fd73616f29a7d4b75ff3dd913) Thanks [@jbroma](https://github.com/jbroma)! - Fix path to `favicon.ico` on Windows

- [#464](https://github.com/callstack/repack/pull/464) [`72c770b`](https://github.com/callstack/repack/commit/72c770bb4ac5540a3c73cf244ca861069a37b045) Thanks [@jbroma](https://github.com/jbroma)! - Upgrade TypeScript, ESLint, TypeDoc in the repository

## 4.0.0-rc.2

## 4.0.0-rc.1

### Patch Changes

- [#554](https://github.com/callstack/repack/pull/554) [`ed82e29`](https://github.com/callstack/repack/commit/ed82e29c2871411fd73616f29a7d4b75ff3dd913) Thanks [@jbroma](https://github.com/jbroma)! - Fix path to favicon.ico on Windows

## 4.0.0-rc.0

### Major Changes

- [#430](https://github.com/callstack/repack/pull/430) [`0d96b11`](https://github.com/callstack/repack/commit/0d96b11ff3a6e2c21eb622e21ff7947db29a3272) Thanks [@jbroma](https://github.com/jbroma)! - BREAKING CHANGE: Upgrade to Node 18, drop support for Node 16.

### Patch Changes

- [#464](https://github.com/callstack/repack/pull/464) [`72c770b`](https://github.com/callstack/repack/commit/72c770bb4ac5540a3c73cf244ca861069a37b045) Thanks [@jbroma](https://github.com/jbroma)! - chore: upgrade TypeScript, ESLint, TypeDoc

## 1.1.0

### Minor Changes

- [#475](https://github.com/callstack/repack/pull/475) [`cc997a2`](https://github.com/callstack/repack/commit/cc997a2f84b4835f8fe597487b0cde6f41b4b7f0) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - Added X-React-Native-Project-Root header, so the RN CLI picks up the running bundler correctly

## 1.0.2

### Patch Changes

- [#441](https://github.com/callstack/repack/pull/441) [`a66785d`](https://github.com/callstack/repack/commit/a66785d4bdb629ab9abce2bf5fc0dc4b632072ef) Thanks [@hexboy](https://github.com/hexboy)! - fix(dev-server): fix Failed to open stack frame in editor error

* [#426](https://github.com/callstack/repack/pull/426) [`719c2ef`](https://github.com/callstack/repack/commit/719c2ef3e1af0c82de8042de2c5c21ab88a287ea) Thanks [@jbroma](https://github.com/jbroma)! - Upgraded source-map to 0.7.4

## 1.0.1

### Patch Changes

- [#308](https://github.com/callstack/repack/pull/308) [`ad9581a`](https://github.com/callstack/repack/commit/ad9581a6d690b128991a9d64374ecb4b8d49c413) Thanks [@jbroma](https://github.com/jbroma)! - Make all packages compatible with Node v18

- Updated dependencies [[`ad9581a`](https://github.com/callstack/repack/commit/ad9581a6d690b128991a9d64374ecb4b8d49c413)]:
  - @callstack/repack-debugger-app@1.0.2

## 1.0.0

### Major Changes

- [#186](https://github.com/callstack/repack/pull/186) [`05d126e`](https://github.com/callstack/repack/commit/05d126e63802f0702a9e353e762f8b6a77fcd73e) Thanks [@zamotany](https://github.com/zamotany)! - ### Bundler-agnostic development server

  Extracted development server from `@callstack/repack` into a separate package and made it bundler-agnostic.

### Minor Changes

- [#189](https://github.com/callstack/repack/pull/189) [`bc42023`](https://github.com/callstack/repack/commit/bc420236687047752cf1ee42204b2f510aec144a) Thanks [@zamotany](https://github.com/zamotany)! - ### Development server API

  Added API endpoints to `@callstack/repack-dev-server`:

  - `GET /api/platforms` - List all platforms with active compilations
  - `GET /api/:platform/assets` - List all assets (`name` and `size`) for a given compilation
  - `GET /api/:platform/stats` - Get compilation stats
  - Websocket server under `/api` URI for logs and compilations events

* [#230](https://github.com/callstack/repack/pull/230) [`e6dc69d`](https://github.com/callstack/repack/commit/e6dc69d35f287af08d09944edd8e6d12f28484cf) Thanks [@jbinda](https://github.com/jbinda)! - Introduce `fastify-favicon` plugin to prevent server logger from emitting error log related to `GET 400 /favicon.ico` when requesting bundles via browser.

- [#239](https://github.com/callstack/repack/pull/239) [`6d65156`](https://github.com/callstack/repack/commit/6d65156366bc88edefdae7a3d0310ddbcdf48886) Thanks [@jbinda](https://github.com/jbinda)! - Expose favicon.ico in devserver

### Patch Changes

- [#238](https://github.com/callstack/repack/pull/238) [`b913b89`](https://github.com/callstack/repack/commit/b913b8981334854cc13076af2a9c8a12bc465d1b) Thanks [@jbinda](https://github.com/jbinda)! - Add `archive` script in dev-server

* [#200](https://github.com/callstack/repack/pull/200) [`c75cdc7`](https://github.com/callstack/repack/commit/c75cdc7a44351bb4702232e603031e2880f2839d) Thanks [@zamotany](https://github.com/zamotany)! - Prevent server logger from emitting log to API WS server before WS servers are created.

* Updated dependencies [[`05d126e`](https://github.com/callstack/repack/commit/05d126e63802f0702a9e353e762f8b6a77fcd73e)]:
  - @callstack/repack-debugger-app@1.0.0

## 1.0.0-next.3

### Minor Changes

- [#230](https://github.com/callstack/repack/pull/230) [`e6dc69d`](https://github.com/callstack/repack/commit/e6dc69d35f287af08d09944edd8e6d12f28484cf) Thanks [@jbinda](https://github.com/jbinda)! - Introduce `fastify-favicon` plugin to prevent server logger from emitting error log related to `GET 400 /favicon.ico` when requesting bundles via browser.

* [#239](https://github.com/callstack/repack/pull/239) [`6d65156`](https://github.com/callstack/repack/commit/6d65156366bc88edefdae7a3d0310ddbcdf48886) Thanks [@jbinda](https://github.com/jbinda)! - Expose favicon.ico in devserver

### Patch Changes

- [#238](https://github.com/callstack/repack/pull/238) [`b913b89`](https://github.com/callstack/repack/commit/b913b8981334854cc13076af2a9c8a12bc465d1b) Thanks [@jbinda](https://github.com/jbinda)! - Add `archive` script in dev-server

## 1.0.0-next.2

### Patch Changes

- [#200](https://github.com/callstack/repack/pull/200) [`c75cdc7`](https://github.com/callstack/repack/commit/c75cdc7a44351bb4702232e603031e2880f2839d) Thanks [@zamotany](https://github.com/zamotany)! - Prevent server logger from emitting log to API WS server before WS servers are created.

## 1.0.0-next.1

### Minor Changes

- ### Development server API

  Added API endpoints to `@callstack/repack-dev-server`:

  - `GET /api/platforms` - List all platforms with active compilations
  - `GET /api/:platform/assets` - List all assets (`name` and `size`) for a given compilation
  - `GET /api/:platform/stats` - Get compilation stats
  - Websocket server under `/api` URI for logs and compilations events

## 1.0.0-next.0

### Major Changes

- ### Bundler-agnostic development server

  Extracted development server from `@callstack/repack` into a separate package and made it bundler-agnostic.

### Patch Changes

- Updated dependencies []:
  - @callstack/repack-debugger-app@1.0.0-next.0

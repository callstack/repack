# @callstack/repack-dev-server

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

# @callstack/repack-dev-server

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

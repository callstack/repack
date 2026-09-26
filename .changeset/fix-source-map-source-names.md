---
"@callstack/repack": patch
"@callstack/repack-dev-server": patch
---

Fix source map source names and development stack frames for files whose path
URLs would encode.

- `babel-loader` and `babel-swc-loader` no longer set `sourceRoot`. Webpack, and
  Rspack whenever Babel produced the map, prepended it to the absolute source
  path, so project files were named `src/<dir>/<absolute path>` in development
  and release source maps.
- The dev server now returns symbolicated file names exactly as the bundler
  emitted them. Before, `source-map` percent-encoded them, so a frame outside the
  project root came back as `[projectRoot%5E2]/...`, and a path with a space or
  non-ASCII character came back encoded. The encoded name broke opening the file
  from LogBox and reading its source when the map has no embedded content.
- Development asset requests with an encoded directory name no longer 404.

---
'@callstack/repack': major
'@callstack/repack-init': major
---

Require `@rspack/core` 2.0 or newer. Rspack 1 is no longer supported, and new projects created with `@callstack/repack-init` use Rspack 2.

- Re.Pack no longer sets `experiments.parallelLoader`, which Rspack 2 removed. Set `parallel: true` on loader rules instead. The `hideParallelModeWarning` option of `@callstack/repack/babel-swc-loader` was removed with the warning it hid.
- `REPACK_EXPERIMENTAL_CACHE` and `--reset-cache` use the top-level `cache` option instead of `experiments.cache`.
- Re.Pack sets `module.parser.javascript.exportsPresence` to `'auto'` for Rspack, so missing-export imports in React Native libraries stay warnings instead of failing the build.
- `RSPACK_PROFILE` traces to the `logger` layer by default.
- `bundle --json` keeps including assets, chunks and modules when the project has no stats config.
- Production source maps name files outside the project root by their resolved absolute path.

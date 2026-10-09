---
'@callstack/repack': major
'@callstack/repack-plugin-reanimated': major
---

Remove APIs deprecated in Re.Pack 5: `ChunksToHermesBytecodePlugin` (use `HermesBytecodePlugin`), `getPublicPath`, the `--webpackConfig` CLI option (use `--config`), the `@callstack/repack/commands/rspack` and `@callstack/repack/commands/webpack` entry points (use `@callstack/repack/commands`), and `reanimatedModuleRules` from `@callstack/repack-plugin-reanimated` (use `reanimated4ModuleRules`). `OutputPlugin` now rejects the no-op `output.bundleFilename`, `output.sourceMapFilename` and `output.assetsPath` options.

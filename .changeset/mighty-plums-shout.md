---
"@callstack/repack": minor
---

Introduce `BabelLoader`, available as `@callstack/repack/babel-loader` which utilizes `hermes-parser` for JS & Flow files and default babel parser for TS files. Can be run in parallel with `experiments.parallelLoader` in Rspack.
---
"@callstack/repack": patch
---

Fix `HermesBytecodePlugin` skipping source map composition for many chunks. The plugin ran in `assetEmitted`, where a chunk's `.map` file might not be written yet, so hermesc ran without source maps, embedded debug info in the bytecode and skipped source map composition. It now runs in `afterEmit`, once all assets are on disk.

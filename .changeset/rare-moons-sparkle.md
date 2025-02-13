---
"@callstack/repack": major
---

BREAKING: Simplified RepackPlugin configuration by removing `context`, `mode`, and `sourceMaps` options in favor of using values from Rspack/webpack configuration.

Made `platform` and `output` options optional (they are now inferred automatically). The plugin configuration object is now entirely optional, allowing for minimal setup with `new Repack.RepackPlugin()`.

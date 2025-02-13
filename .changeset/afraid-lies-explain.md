---
"@callstack/repack": major
---

BREAKING: `config.devtool` is now used to control the behaviour of generated sourcemaps. To enable sourcemaps again, please remove `devtool: false` from your config or set it explicitly to one of valid values (e.g. `source-map`).

Introduced a dedicated `SourceMapPlugin` that consolidates sourcemap configuration and improves sourcemap handling by relying on the `devtool` option. The plugin is part of the Repack plugin and does not need to be added separately.

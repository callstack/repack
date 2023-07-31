---
"@callstack/repack": minor
---

Allow storing compilation stats.

You can now run `webpack-bundle` with `--json <file> --stats <preset>` (like with `webpack-cli`) to store compilation stats in the specified file.
Compilation stats can be used to analyze the bundle (e.g. with [`webpack-bundle-analyzer`](https://github.com/webpack-contrib/webpack-bundle-analyzer) or https://statoscope.tech/).

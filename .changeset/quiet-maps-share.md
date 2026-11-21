---
"@callstack/repack": patch
---

Respect `output.devtoolModuleFilenameTemplate` in `SourceMapPlugin` when the dev server isn't running, so release source maps can avoid absolute build machine paths in `sources`. Without the option, `sources` are unchanged.

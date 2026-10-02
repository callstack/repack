---
'@callstack/repack': patch
---

Emit an additional `res/raw` copy of bundled Android font binaries so Metro-compatible consumers such as Skia can load them by name. Preserve the existing `res/font` output for native `@font/...`, `R.font`, and XML font-family references. Generate `res/raw/keep.xml` for bundled Android resources so resource shrinking preserves both font copies and other assets loaded by name at runtime.

XML font-family resources continue to use `res/font`. Asset metadata and iOS, development-server, inline, and remote-loader output paths are unchanged.

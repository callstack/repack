---
"@callstack/repack": patch
---

Fix the webpack compiler double-joining absolute paths in `getSource`. The dev server resolves symbolicated stack frames to absolute paths before asking the compiler for their source, but the webpack compiler joined them onto the project root a second time, so the lookup failed. This only affected the fallback used when a frame's source is not embedded in the source map, for example with `nosources-*` devtools, and now matches the Rspack compiler.

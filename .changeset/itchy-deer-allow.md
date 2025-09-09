---
"@callstack/repack": patch
---

Babel can detect whether a file being transformed is ESM or CJS and return this information. However, SWC previously assumed it was transforming only ESM files, which could cause issues with default export interop in some cases. SWC will now inherit the source type from Babel.

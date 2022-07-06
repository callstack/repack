---
"@callstack/repack": minor
---

### Assets loader

By default, `@callstack/repack/assets-loader` will extract assets - meaning, they will be put in dedicated files and bundled together with the application.

Inlined assets, however, are encoded as `base64` string into a data URI. Inlined assets are stored inside the actual JavaScript bundle - no dedicated files will be emitted
for them.

- Add `inline: boolean` option to `@callstack/repack/assets-loader`.
- Add support for calculating `width`, `height` and `scale` for inlined assets.
- Add support for inlining multiple scales.

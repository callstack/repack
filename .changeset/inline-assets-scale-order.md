---
"@callstack/repack": patch
---

Pass scales of inlined assets to `AssetSourceResolver.pickScale` in ascending order. Previously, assets with fractional scales such as `@1.5x` resolved to the wrong variant, for example the `@1.5x` image on a device with a pixel ratio of 3.5.

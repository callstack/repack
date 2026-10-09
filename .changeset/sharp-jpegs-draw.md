---
"@callstack/repack": patch
---

Fix `.jpeg` images not showing in Android release builds. They were emitted to `raw` instead of `drawable-*`, where React Native looks for them.

If you have a `.jpeg` and a `.png`/`.jpg`/`.gif`/`.webp` image with the same name in the same directory (e.g. `logo.png` and `logo.jpeg`), rename one of them. Both now resolve to the same Android drawable resource name, and the build fails with a duplicate resources error.

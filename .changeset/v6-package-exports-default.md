---
'@callstack/repack': major
---

`getResolveOptions()` now enables package exports by default (`enablePackageExports: true`), matching Metro's default since React Native 0.79. Pass `enablePackageExports: false` to keep resolving through main fields only.

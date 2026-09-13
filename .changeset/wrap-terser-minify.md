---
"@callstack/repack": patch
---

Fix production bundles shipping unminified with `terser-webpack-plugin` 5.6.0 and newer, which only minifies `.js` assets by default and silently skipped Re.Pack's `.bundle` output.

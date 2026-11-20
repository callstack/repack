---
"@callstack/repack": minor
---

Add `jsonParse` option to `RepackPlugin`. It sets `module.generator.json.JSONParse`, so `jsonParse: false` bundles `.json` files as JS objects instead of `JSON.parse('...')` calls, which is faster in release builds on Hermes. It is off by default and needs Rspack 1.3.0+ or webpack 5.99.0+.

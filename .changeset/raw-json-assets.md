---
"@callstack/repack": minor
---

Add `enableRawJson` option to `getAssetTransformRules`. It is enabled by default and adds a `type: "json"` rule with `generator: { JSONParse: false }`, so `.json` files are bundled as raw text and parsed at runtime with `JSON.parse('...')` instead of being parsed into an object at build time. Pass `enableRawJson: false` to keep the previous behavior.

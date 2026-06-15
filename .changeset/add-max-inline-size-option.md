---
"@callstack/repack": minor
---

Add `maxInlineSize` option to assets loader for size-based asset inlining. Use it together with `inline: true` — assets whose largest variant is within the threshold are inlined as base64 URIs; larger assets are extracted as separate files.

---
"@callstack/repack": minor
---

`getResolveOptions` can be now called without any params and the `platform` extensions will be resolved automatically. This makes `getResolveOptions` useful when used in static configs where `platform` variable isn't exposed.

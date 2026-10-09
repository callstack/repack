---
'@callstack/repack-plugin-reanimated': patch
---

Fix `ReanimatedPlugin` not hiding the `setUpTests` / `Critical dependency: require function` warning from Reanimated 4's Jest utilities, whose message is now prefixed with `[Reanimated] `.

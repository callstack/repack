---
"@callstack/repack": patch
---

### HMR

- Upgraded `@pmmmwh/react-refresh-webpack-plugin` to `0.5.7` and added `react-refresh@^0.14.0` as a `@callstack/repack` dependency.
- `RepackTargetPlugin` now requires to pass `hmr?: boolean` property to a constructor - only relevant, if you're __not__ using `RepackPlugin`. 

---
"@callstack/repack": minor
---

Add Rspack 2 support. Re.Pack now works with both Rspack 1.x and 2.x from a single release - it detects the installed `@rspack/core` major and adjusts its behavior automatically. Rspack 1 and webpack setups are unaffected: nothing changes unless you upgrade.

To move a project to Rspack 2:

- Use Node.js `^20.19.0 || >=22.12.0` - required by Rspack 2 itself; Re.Pack raises a clear error on older versions instead of failing with `ERR_REQUIRE_ESM`
- Install `@rspack/plugin-react-refresh@^2` and `react-refresh` - under Rspack 2, development/HMR support is wired through the official React Refresh plugin
- Move any `experiments.cache` configuration to the top-level `cache` option - Rspack 2 ignores the legacy location, and Re.Pack warns when it detects it

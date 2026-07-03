---
"@callstack/repack": minor
---

Add support for Rspack 2 while keeping Rspack 1 fully working.

Re.Pack now detects the installed `@rspack/core` major version and adapts:

- `experiments.parallelLoader` is only set under Rspack 1 (removed in Rspack 2)
- `module.parser.javascript.exportsPresence` defaults to `'auto'` under Rspack 2 to keep Metro-like tolerance for invalid imports inside node_modules (overridable in your project config)
- a one-time warning is shown when a legacy `experiments.cache` value is detected under Rspack 2 (where it is silently ignored, so persistent caching would be lost without any signal) - the config is left untouched, migrate it to the top-level `cache` option; `--reset-cache` reads both locations
- React Refresh: under Rspack 2 Re.Pack applies the official `@rspack/plugin-react-refresh` v2 plugin (now an optional peer dependency - install it alongside `@rspack/core@2`); under Rspack 1 and webpack the client runtime files are bundled with Re.Pack, so the `@rspack/plugin-react-refresh@1` dependency is gone
- `--trace-*` profiling defaults to the `logger` trace layer under Rspack 2 (published Rspack 2 binaries do not include the perfetto layer)
- a clear error is raised when running Rspack 2 on Node.js older than 20.19 (Rspack 2 requires Node `^20.19.0 || >=22.12.0`)
- `ModuleFederationPluginV1` verifies that `@module-federation/runtime-tools` is installed when running under Rspack 2 (it is no longer installed automatically by `@rspack/core`)

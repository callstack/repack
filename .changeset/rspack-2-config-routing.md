---
"@callstack/repack": patch
---

Route the default Rspack configuration by the installed `@rspack/core` major version:

- `experiments.parallelLoader` is only set under Rspack 1 - Rspack 2 removed the flag (parallel loading is stable and opt-in per rule via `use[].parallel`), so it is no longer injected there
- `module.parser.javascript.exportsPresence` defaults to `'auto'` under Rspack 2 to keep Metro-like tolerance for invalid imports inside node_modules (Rspack 2 changed the default to `'error'`, which breaks builds on imports Metro tolerates; overridable in your project config)
- `RSPACK_PROFILE` profiling defaults to the `logger` trace layer under Rspack 2 (published Rspack 2 binaries do not include the perfetto layer; `RSPACK_TRACE_LAYER=perfetto` is still accepted for custom builds that enable it)

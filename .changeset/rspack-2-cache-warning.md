---
"@callstack/repack": patch
---

Show a one-time warning when a legacy `experiments.cache` value is detected under Rspack 2. Rspack 2 moved persistent cache configuration to the top-level `cache` option and silently ignores the legacy key, so persistent caching would be lost without any signal. The config is left untouched - migrate the value to the top-level `cache` option in your Rspack config.

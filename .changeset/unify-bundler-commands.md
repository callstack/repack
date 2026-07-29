---
"@callstack/repack": minor
"@callstack/repack-init": patch
---

Add the unified `@callstack/repack/commands` entry point, which automatically detects Rspack or webpack from the project configuration and supports an explicit `--bundler` override. The bundler-specific command entry points remain available with deprecation warnings, and Re.Pack Init now generates the unified command configuration.

Reject pending webpack asset requests when compilation fails instead of leaving the requests hanging.

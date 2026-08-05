---
"@callstack/repack": minor
"@callstack/repack-init": patch
---

Add the unified `@callstack/repack/commands` entry point with automatic bundler detection and a `--bundler` override. Re.Pack Init now uses it, while bundler-specific entry points remain available with deprecation warnings.

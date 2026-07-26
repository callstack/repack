---
"@callstack/repack": patch
---

Restructure React Refresh support to work under both Rspack 1 and Rspack 2.

- Under Rspack 2, Re.Pack applies the official `@rspack/plugin-react-refresh` v2 plugin. The plugin is now an **optional peer dependency** (`^2.0.0`) instead of a regular dependency - Rspack 2 users must install it (along with `react-refresh`) in their project.
- Under Rspack 1 and webpack, nothing changes: the React Refresh client runtime files are now bundled with Re.Pack (vendored from `@rspack/plugin-react-refresh@2.0.2`, MIT), so the `@rspack/plugin-react-refresh@1` dependency is no longer needed and has been removed.

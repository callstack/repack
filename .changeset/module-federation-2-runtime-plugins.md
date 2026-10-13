---
"@callstack/repack": patch
---

Keep the options of Module Federation 2.x runtime plugins passed to `ModuleFederationPluginV2` as `[path, options]` in `runtimePlugins`. Such entries were silently dropped before.

Fix the typings of the `@callstack/repack/mf/*` runtime plugins with `@module-federation/enhanced` 0.17 and newer, where `FederationRuntimePlugin` and `FederationHost` were renamed to `ModuleFederationRuntimePlugin` and `ModuleFederation`. The types are now derived from the installed runtime, so they work with every supported version.

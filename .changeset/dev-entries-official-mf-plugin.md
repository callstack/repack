---
"@callstack/repack": patch
---

Fix `DevelopmentPlugin` crashing with `Cannot read properties of undefined (reading 'exposes')` when an official Module Federation plugin (from `@module-federation/enhanced`, or the built-in `container.ModuleFederationPlugin` of Rspack or webpack) is used with the dev server. The check for official plugins read `exposes` from `plugin.config`, which only Re.Pack's own Module Federation plugins have, instead of `plugin._options`.

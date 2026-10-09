---
'@callstack/repack': patch
---

Keep Module Federation runtime plugins passed as `[path, options]` tuples in `ModuleFederationPluginV2`. They were previously dropped silently.

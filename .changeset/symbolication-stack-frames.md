---
"@callstack/repack-dev-server": patch
"@callstack/repack": patch
---

Fix stack-frame symbolication and open-in-editor for Module Federation setups:

- Symbolication no longer fails the whole request when one frame's source map is unavailable (e.g. a federated remote chunk served by another dev server) — failed frames pass through unchanged, mirroring Metro, and the response stack is always 1:1 with the request.
- Source maps for bundles the local compiler didn't build are now fetched via the `//# sourceMappingURL=` comment the bundle declares, resolved relative to the bundle URL and validated before use.
- Symbolication survives corrupt source names that Module Federation v2 emits into host bundle maps (previously `Invalid URL` failed every stack on MFv2 hosts).
- Frames are collapsed by resolved source path (like React Native's default Metro config) and the source map `ignoreList`/`x_google_ignoreList` field, instead of not at all.
- `/open-stack-frame` now decodes URL-encoded `[projectRoot^N]` tokens (returned as `[projectRoot%5E2]/...` by symbolication), so tapping frames that resolve into `node_modules` opens the editor instead of silently doing nothing.
- Editor launch failures are logged with an actionable hint (set `REACT_EDITOR`) instead of being silently swallowed; frames at generated column 0 symbolicate correctly.

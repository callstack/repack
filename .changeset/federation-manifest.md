---
'@callstack/repack': minor
---

Add an opt-in `manifest` option to both module federation plugins. When set, the build emits `repack-federation-manifest.json` next to the bundle: shared dependencies report the versions actually installed in `node_modules` instead of the `*` range the plugins configure by default, and an additive `reactNative` block lists the native modules found in the module graph. Field shapes follow the upstream `mf-manifest.json` spec, so existing tooling can parse the file as-is. With the option absent, builds are byte-identical to before.

Two commands consume the manifest. `npx react-native federation-manifest <file|dir|url>` prints a human-readable summary of what a host or remote shipped, or the raw document with `--json`. `npx react-native federation-doctor --host <source> --remotes <list>` compares a host manifest against its remotes and reports singleton version drift, `singleton`/`eager` mismatches, unresolvable `requiredVersion` ranges, native modules the host does not declare, and remotes that ship no manifest. It exits 1 on drift and 2 when a check could not run, so it works as a CI gate; `--format json` and `--allow-missing-manifests` cover scripts and gradual rollout.

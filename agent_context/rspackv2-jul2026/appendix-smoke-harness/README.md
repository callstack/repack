# Appendix: dual-major smoke harness (verification artifact)

The actual script used for the dual-major smoke verification recorded in
[doc 07](../07-verification-results.md) / [doc 08](../08-implementation-notes.md)
(originally run from an ephemeral session scratchpad; preserved here so the
"formalize into a real test suite" PR — see [doc 09](../09-pr-split-plan.md),
closer PR — doesn't have to rebuild it from prose). It smoke-tests the **built
`packages/repack` dist** against whichever `@rspack/core` major is installed
in the current working directory:

1. `getRepackConfig` routing — `experiments.parallelLoader` kept under v1 /
   dropped under v2, `exportsPresence: 'auto'` parser override under v2 only.
2. Persistent-cache accessor + legacy-cache **warn-only** handling (per
   maintainer feedback #5, doc 10 §5): warns once, mutates nothing, accessor
   still reads the legacy location. (Assertions updated 2026-07-02 when the
   warn-only rework was applied to the reference branch.)
3. `ensureNodeCompat` guard passes on a supported Node.
4. Full dev build through `DevelopmentPlugin`: HMR client + React Refresh
   wiring present in the bundle, and the refresh runtime comes from the
   correct source per major (vendored files under v1/webpack, official
   `@rspack/plugin-react-refresh` under v2).

## Lab setup (reconstructed from the 2026-07-02 session)

Two throwaway npm projects ("labs"), each with `src/App.jsx` containing a
trivial component (`export function App() { return null; }`) and these
dependencies (exact manifests used):

**v1-lab** — `@rspack/core@^1.7.12` (nothing else; repack's own deps cover
the manual refresh wiring).

**v2-lab** —

```json
{
  "@module-federation/enhanced": "^2.6.0",
  "@rspack/core": "^2.1.2",
  "@rspack/plugin-react-refresh": "^2.0.2",
  "@swc/helpers": "^0.5.23",
  "react-refresh": "^0.18.0"
}
```

Notes (from doc 08):

- `react-refresh` must be installed in the v2 lab explicitly — pnpm-strict
  layouts won't hoist repack's copy into the official plugin's resolution
  scope.
- `react-native` is stubbed via `resolve.alias` to [rn-stub/](./rn-stub/)
  (real RN sources need the full flow/babel loader chain, which is out of
  scope for wiring-level smoke tests). The stub covers the modules the
  DevelopmentPlugin runtime imports: `index.js` (`DevSettings`, `LogBox`),
  `Libraries/Core/NativeExceptionsManager`,
  `Libraries/Utilities/DevLoadingView`,
  `Libraries/NativeModules/specs/NativeRedBox`.
- The repack loader is resolved via `resolveLoader.alias`
  (`@callstack/repack/react-refresh-loader` → the dist file), since the labs
  don't install repack from a registry.
- Node 26 was used; the harness assumes `pnpm build` has been run in
  `packages/repack` first.

## Running

```sh
cd <lab-dir> && node <repo>/agent_context/rspackv2-jul2026/appendix-smoke-harness/smoke.cjs
```

The script auto-detects the installed major and flips its assertions
accordingly. All checks printed `PASS` on 2026-07-02 against `1.7.12` and
`2.1.2` (doc 08 § Verification performed).

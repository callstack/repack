# tester-app-rspack1

Standalone validation app pinned to **Rspack 1**, deliberately **outside the
pnpm workspace** (excluded via a negation glob in the root
`pnpm-workspace.yaml`, and marked as its own workspace root by the local
`pnpm-workspace.yaml`).

## Why outside the workspace

`packages/repack` has `@rspack/core@^2` as a devDependency (needed for types
and unit tests). Inside the workspace, repack is symlinked, so its published
code's plain `require('@rspack/core')` resolves that devDependency **before**
any version an app pins - every workspace app effectively runs Rspack 2,
regardless of its manifest. The shipped code intentionally stays free of
monorepo-aware resolution workarounds (decision 2026-07-03), so the Rspack 1
validation surface has to be a project where resolution works like a real
user project:

- own `node_modules` (nothing hoisted from the workspace),
- repack installed from a **packed tarball** (`file:./callstack-repack.tgz`)
  - a tarball install has no nested `node_modules`, so `@rspack/core`
  resolves to this app's own `^1.x` copy.

The src is intentionally minimal and **not** shared with `tester-app`
(sharing src across the workspace boundary would resolve `react`/
`react-native` from two different installs). It covers the bundler-major
surface: dev server, HMR/React Refresh (the vendored-runtime path under v1),
async local chunks via ScriptManager, and production bundling. Full feature
coverage (NativeWind, Reanimated, remote chunks/mini-apps, assets matrix)
lives in [`tester-app`](../tester-app/) - the **Rspack 2** example.

## Setup

```sh
pnpm run pack-repack   # builds packages/repack and packs it to ./callstack-repack.tgz
pnpm install           # standalone install (own lockfile, gitignored)
```

Re-run both steps after changing `packages/repack` - the tarball is a
snapshot, not a link.

## Usage

```sh
pnpm start                # dev server (Rspack 1)
pnpm bundle:android       # production bundle - should print "(Rspack 1.x)"
pnpm android / pnpm ios   # native shells (react-native-test-app)
pnpm pods                 # iOS pods (see tester-app notes re: ruby version)
```

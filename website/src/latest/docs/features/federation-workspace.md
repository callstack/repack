# Federation Workspace

A Module Federation setup is one system: a host, its remotes, and the shared
dependencies they must agree on. When that agreement lives in eight hand-edited
config files, it drifts — versions go stale, eager flags stop matching, and the
crash shows up in production. The federation workspace tools make the agreement
a single source of truth that is derived, checked and scaffolded instead of
hand-maintained:

- [`defineShared`](/api/utils/define-shared) — builds the `shared` option with
  exact pins resolved from what is actually installed.
- [`repack-federation.json`](/api/cli/repack-federation-json) — the committed
  map of the workspace: which host, which remotes, where their manifests are.
- [`federation-doctor`](/api/cli/federation-doctor) — the CI gate that checks
  the workspace, before or after a build.
- [`federation-init`](/api/cli/federation-init) — scaffolds a new remote from
  a feature folder, wired into all of the above.

## One source of truth for shared dependencies

Versions of shared dependencies are never literals in your configs. List the
packages, and `defineShared` pins each one to the exact installed version at
build time — host and remotes resolve from the same install, so their manifests
agree by construction:

```ts
// configs/rspack.host-app.mts
import * as Repack from '@callstack/repack';

const SHARED_DEPS = ['react', 'react-native', '@react-navigation/native'];

export default Repack.defineRspackConfig((env) => ({
  // ...
  plugins: [
    new Repack.plugins.ModuleFederationPluginV1({
      name: 'HostApp',
      shared: Repack.defineShared(SHARED_DEPS, {
        context: env.context,
        role: 'host',
      }),
    }),
  ],
}));
```

A remote config is the same call with `role: 'remote'` plus the standalone
mode line:

```ts
shared: Repack.defineShared(SHARED_DEPS, {
  context: env.context,
  role: 'remote',
  // `--standalone` is runtime-only (env.argv): never committed.
  mode: env.argv?.standalone ? 'standalone' : 'federated',
}),
```

`eager` follows the Module Federation convention from `role` and `mode`: the
host is eager, federated remotes are lazy, and a build with
`react-native webpack-bundle ... --standalone` makes everything eager so the
remote runs without the host. The flag travels through `env.argv` only — there
is no mode file to forget to revert.

## Declaring the workspace

`repack-federation.json` at the workspace root tells the tools what the setup
is. Paths are relative to the file; unknown fields are rejected, so typos fail
loudly:

```json
{
  "host": { "root": ".", "manifest": "build/host-app/ios" },
  "remotes": {
    "MiniApp": {
      "root": ".",
      "manifest": "build/mini-app/ios",
      "standalone": true,
      "port": 8082
    }
  }
}
```

`standalone: true` declares that a remote supports standalone builds; running
`--standalone` for a remote that does not declare it is refused before
anything compiles. `port` is consumed by future tooling.

## Checking the workspace

With the file in place, the doctor needs no flags — run it from anywhere inside
the workspace:

```sh
# after building host and remotes (manifests required)
npx react-native federation-doctor

# before anything is built: package.json + configs only
npx react-native federation-doctor --dry-run

# additionally compare remotes with each other (shared-only, opt-in)
npx react-native federation-doctor --pairwise
```

Exit codes are CI-shaped: `0` clean (warnings allowed), `1` drift found, `2`
the check could not run. A host that is eager where a remote is lazy — the
expected convention, not drift — is reported as an `EAGER_ADVISORY` warning,
not an error. See
[`federation-doctor`](/api/cli/federation-doctor) for every finding code.

## Adding a remote

`federation-init` turns a feature folder into a registered remote: it scans
the folder's imports, generates versionless `rspack.<remote>.mts` /
`webpack.<remote>.mts` configs on `defineShared`, merges the scanned
dependencies (at the host's exact versions) into the remote's `package.json`,
registers the remote in the host's federation plugin and in
`repack-federation.json` — and shows every diff before writing any of it:

```sh
npx react-native federation-init ./features/store --name store
```

`--yes` pre-approves the diffs and auto-aligns divergent pins for CI-style
runs; re-running is idempotent. The dependencies are declared, not installed —
run your package manager afterwards.

## End to end

1. Write configs with `defineShared` (host: `role: 'host'`, remotes:
   `role: 'remote'` + the `env.argv` mode line).
2. Commit `repack-federation.json` with host and remotes.
3. Gate CI with `federation-doctor` post-build and `--dry-run` pre-build.
4. Grow the workspace with `federation-init`; `--standalone` any remote that
   declares it.

Worked example: `apps/tester-federation` in the Re.Pack repository is a
complete host + remote workspace built exactly this way.

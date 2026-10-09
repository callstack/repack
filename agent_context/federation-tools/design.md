# Federation Tools — Design

Effort: tooling that makes multi-app Module Federation (host + remotes, often in
separate repos) safe to ship with Re.Pack. This doc tracks the thinking and the
decisions as the effort evolves, one section per shipped piece.

## The problem (verified in code)

- `requiredVersion` defaults to `'*'` in both plugins
  (`packages/repack/src/plugins/ModuleFederationPluginV1.ts:194`,
  `ModuleFederationPluginV2.ts:209`). No build-time or runtime code ever
  compares host vs remote versions.
- Native module compatibility is documented in a single sentence
  (`website/src/latest/docs/getting-started/microfrontends.md:30`) and enforced
  by nothing.
- Shared config blocks are duplicated by hand across host and every remote;
  `eager` conventions are social, not code.
- Result: version/native drift is only discovered as runtime crashes
  (issues #1367, #1368, #1428).

## The base primitive: a Repack federation manifest

Everything downstream (doctor, CI gate, init/codemod, dev runner) consumes one
artifact: a machine-readable manifest emitted at build time by
`ModuleFederationPluginV1`/`V2`. The manifest, not the doctor, is the primitive.

### Alignment with upstream (rspack.rs / Module Federation 2.0)

MF 2.0 already standardizes `mf-manifest.json`
([spec](https://github.com/module-federation/core/blob/main/arch-doc/manifest-specification.md)):
`id`, `name`, `metaData`, `shared[]` (with resolved `version`, `singleton`,
`requiredVersion`, `hash`, `assets`), `remotes[]`, `exposes[]`. The MF plugin
that Repack V2 wraps already emits it. We do **not** invent a parallel format:

- The Repack manifest **reuses the upstream schema shape verbatim** and adds a
  single React-Native extension block. Web MF and Repack consumers can parse
  the common part with the same tooling.
- Distinct filename to avoid collision with the upstream `mf-manifest.json`
  (which V2's inner plugin may also emit): default
  **`repack-federation-manifest.json`**, configurable.
- Option naming mirrors upstream so it is muscle memory for rspack/MF users:
  `manifest?: boolean | { fileName?: string; filePath?: string; native?: ... }`
  on both plugin configs — same shape as `PluginManifestOptions` in
  `@module-federation/rspack`.

### Schema (v1) — `repack-federation-manifest.json`

```jsonc
{
  "manifestVersion": 1,
  // --- upstream mf-manifest-compatible fields ---
  "id": "catalog",
  "name": "catalog",
  "metaData": {
    "name": "catalog",
    "globalName": "catalog",
    "type": "remote",
    "buildInfo": { "buildVersion": "<git sha or package version>", "buildName": "catalog" },
    "remoteEntry": { "name": "remoteEntry.container.jsbundle", "path": "", "type": "var" },
    "publicPath": "https://cdn.example.com/catalog/"
  },
  "shared": [
    {
      "name": "react",
      "version": "19.1.0",            // RESOLVED version, not '*'
      "singleton": true,
      "eager": true,
      "requiredVersion": "^19.1.0",
      "assets": { "js": { "sync": ["..."], "async": [] }, "css": { "js": ..., "async": [] } }
    }
  ],
  "remotes": [ /* upstream shape: federationContainerName, moduleName, alias, entry */ ],
  "exposes": [ /* upstream shape: id, name, path, assets */ ],

  // --- React Native extension block (Repack-specific, additive) ---
  "reactNative": {
    "version": "0.80.1",
    "newArch": true,
    "platforms": ["ios", "android"],
    "nativeModules": [
      {
        "package": "react-native-svg",
        "version": "15.11.2",
        "modules": ["RNSVG", "RNSVGPackage"],
        "turboModule": true,
        "confidence": "static"       // static | heuristic — see detection
      }
    ],
    "dynamicImportDetected": true     // when true, nativeModules is NOT exhaustive
  }
}
```

`manifestVersion` is the compatibility contract for consumers; additive fields
only within a major, bumps are the doctor's job to interpret.

### Resolved versions

Today nothing in the MF plugins reads installed versions — `requiredVersion`
stays `'*'` and resolution is deferred to the bundler internals. Emitting real
versions means, at emission time, resolving each shared dep from
`compiler.context` (the pattern `DevelopmentPlugin.ts:100-118` already uses for
RN's own `package.json`) and, where available, cross-checking against
compilation stats. No change to how the bundler resolves anything — the
manifest **observes**, it never alters resolution.

### Native module detection — honest scope

- **Build-time (static):** walk the compilation module graph; map every module
  that resolves inside `node_modules/<pkg>` with native code (presence of
  `ios/`/`android/` or `codegenConfig` in `package.json`) to a declaration.
  This is the same dependency→capability table pattern as
  `commands/common/config/validatePlugins.ts`, inverted (we emit instead of warn).
- **Honesty flag:** if any dynamic `require()`/template-literal import is found
  in the graph, `dynamicImportDetected: true` is set. The doctor must treat a
  `heuristic`/possibly-incomplete list as "verify these", never as a green
  checkmark. We never claim exhaustive static guarantees we cannot make.
- **Runtime (later PR, separate):** wrap remote module resolution failures
  (ScriptManager/ResolverPlugin) to report
  `remote X requested NativeY; host manifest does not declare it` instead of a
  raw crash. Build-time manifest + runtime error-context are complementary.

### Backward compatibility — non-negotiables

1. **Opt-in.** Default `manifest: false` (or absent). With the flag absent,
   plugin output is byte-identical to today. This is test-enforced with
   existing snapshot tests.
2. **No unconditional hook taps.** Existing MF plugin tests use bare compiler
   mocks without `hooks` (`__tests__/ModuleFederationPluginV1.test.ts:8-15`);
   hook registration happens only when the option is enabled.
3. **Emit via `afterProcessAssets`** (the `ManifestPlugin.ts:14-32` precedent),
   bundler-agnostic (`compilation.emitAsset` + `compiler.webpack.sources.RawSource`
   work on both webpack and Rspack — no `isRspackCompiler` branch needed).
4. **Filename collisions:** dev-server asset allowlist
   (`commands/consts.ts:37-48`) must serve the new filename; verify the emitted
   `.json` passing through `AssetsCopyProcessor` (it rewrites the
   ManifestPlugin's `.json` today) and `OutputPlugin`'s entry-chunk assertions.
5. **Migration path to default-on:** opt-in for a minor line → docs + codemod
   that adds the flag → default-on in the next major, with `manifest: false`
   escape hatch retained. No breaking change before that major.

## Delivery plan — one feature per PR

Each PR is shippable alone and lands with docs in the same PR.

- **PR 1 — Manifest emission.** `manifest` option on V1+V2, schema v1,
  resolved versions, native module block, dev-server allowlist, unit tests,
  docs page (`website/src/latest/docs/features/`), agent_context kept in sync.
- **PR 2 — Manifest inspection CLI.** `federation-manifest <path|url>`:
  pretty-prints a manifest (local file, built output dir, or remote URL).
  Trivially useful, first consumer, validates schema ergonomics.
- **PR 3 — `federation-doctor`.** Inputs: host + list of remotes
  (local paths or URLs). Compares manifests: shared-version/range drift,
  singleton/eager mismatches, native modules the host does not declare.
  `--format json` + exit codes so it runs as a CI gate (multi-repo story).
  - **Command surface correction (as shipped).** There is no `repack`
    binary and no `repack federation ...` subcommand tree. Both commands are
    flat entries in the RN Community CLI `commands` array
    (`packages/repack/src/commands/index.ts`, surfaced through
    `react-native.config.js`), invoked as
    `npx react-native federation-manifest|federation-doctor`.
    `createBoundCommands` (deprecated webpack/rspack entry points) excludes
    them — they are bundler-independent.
  - **Exit codes locked:** `0` clean (warnings/infos allowed); `1` drift —
    any error-severity finding, including `MISSING_REMOTE_MANIFEST` unless
    `--allow-missing-manifests` downgrades it to a warning; `2` the check
    could not run — missing required option, host manifest not found, or a
    corrupt (invalid) manifest on any side. 2 means "no answer", 1 means
    "bad answer"; CI treats both as failure.
  - **No degraded host fallback.** The host must ship a manifest; the
    doctor does not fall back to `package.json` heuristics (closes the open
    decision below).
- **PR 4 — Single-source shared config + retrofit.** `defineShared()` helper
  (or shared `shared.config.ts` convention) deriving versions from real
  `package.json`; codemod `repack federation init` that generates/repairs
  host & remote configs from installed versions.
  - **Command surface correction (as shipped).** No `repack federation init`
    subcommand tree: the codemod is the flat `react-native federation-init`
    command, alongside `federation-manifest`/`federation-doctor` in the same
    `commands` array. And no `shared.config.ts` convention: the committed
    workspace file is `repack-federation.json` (the host/remotes map for the
    tools); shared versions are never literals at all — `defineShared`
    resolves exact pins from the installed packages at build time.
- **PR 5 — Dev runner (interactive).** `repack federation dev`: light
  `@clack/prompts`-style selection (which remotes, iOS/Android, auto ports),
  then exits interactive mode and streams raw logs in plain scrollable
  terminal output. Equal non-interactive flags (`--ios --remotes cart,catalog
  --ci`) for CI. Status dashboard (N servers, ports, health) as a web page,
  not a TUI — bundler output and alternate-screen UIs fight each other.
- **PR 6+ — Runtime mismatch context** (ResolverPlugin/ScriptManager error
  enrichment), roadmap debt (#1420 V1/V2 duality, v5 docs, Expo #1413).

## User interaction contract

Every shipped command must have: deterministic non-interactive flags (CI
parity with the wizard), human-readable default output, `--json` for
machines, actionable messages that name the package and the versions in
conflict, and a docs page with copy-pasteable examples.
## Open decisions

- [x] Manifest filename/option naming (proposed above) — confirmed; shipped as
  `manifest` / `repack-federation-manifest.json` in PR 1.
- [x] `buildVersion` source: chain implemented in PR 1 — `git rev-parse
  --short HEAD` in `compiler.context` (non-fatal), else root `package.json`
  `version`, else `"unknown"`.
- [x] Doctor host input: resolved at implementation — the host must ship a
  manifest; missing or corrupt host manifest exits 2, no `package.json`
  heuristic fallback.

## PR 1 implementation notes (as built)

Deltas from the design above, all deliberate:

- **Option collision in V2.** `ModuleFederationPluginOptions` from
  `@module-federation/sdk` already declares `manifest?: boolean |
  PluginManifestOptions` (it configures the wrapped plugin's own
  `mf-manifest.json`). Repack V2 now **consumes** `manifest` for the Repack
  manifest and does not forward it to the inner plugin; the inner plugin keeps
  its default behavior and still emits `mf-manifest.json`. Consequence: V2
  users can no longer tune the upstream manifest options through Repack's
  config. Accepted tradeoff for naming symmetry; documented on the features
  page.
- **`reactNative.newArch` omitted in v1 output.** Not reliably detectable from
  the bundler context (it is an app build flag, not a JS graph fact). The
  field is reserved in the schema type but never written; PR 3 (doctor) must
  not depend on it.
- **`reactNative.note` added** (additive string field): explains disabled
  (`nativeAnalysis: false`), degraded (scan threw), or non-exhaustive
  (dynamic import detected) native lists.
- **Confidence downgrade:** when `dynamicImportDetected` is true, every
  `static` entry drops to `heuristic`; the label reflects list completeness,
  not just per-package evidence.
- **Dev-server allowlist** covers the default filename only; a custom
  `manifest.fileName` is served from disk/CDN, not the dev-server asset
  route. Revisit if users ask.
- **Emission shape:** pretty-printed JSON via `compilation.emitAsset` in
  `compilation.hooks.afterProcessAssets`; collision with an existing asset of
  the same name skips emission with a warning instead of erroring.
- **Native toggle named `nativeAnalysis`.** The sketch above had `native?:`;
  the shipped boolean is `nativeAnalysis` to avoid reading as "include native
  code".
- **Chunk-level detachment verified:** `emitAsset` without chunk association
  keeps the manifest out of `chunk.auxiliaryFiles`, which is what keeps
  `OutputPlugin`/`AssetsCopyProcessor` (chunk-iteration based) from touching
  it; asserted in `federationManifestCompilation.test.ts` against a real
  rspack run plus a direct `AssetsCopyProcessor` memfs test.


## PR 2/3 CLI notes (as built)

- **Heuristic honesty, enforced in the doctor:** a host native list is
  trusted only when no `dynamicImportDetected` flag and no
  `confidence: heuristic` entry is present; otherwise missing-native-module
  findings downgrade to `HEURISTIC_ADVISORY` warnings. Unsupported
  `requiredVersion` syntax yields `SHARED_RANGE_UNSUPPORTED` (warning) and
  unknown singleton versions yield `VERSION_UNKNOWN` (info) — the doctor
  reports what it cannot check instead of guessing or passing silently.
- **Host-app-project native-module caveat:** the host manifest's
  `nativeModules` is node_modules-scope; a module wired from the host's app
  project won't be listed. `MISSING_NATIVE_MODULE` (error on a trusted host
  list) names this case in its message and asks for manual verification —
  the manifest cannot distinguish "absent" from "native to the app project".
- **Corrupt vs missing asymmetry:** a missing remote manifest is a finding
  (exit 1, escapable with `--allow-missing-manifests`); a corrupt one aborts
  with exit 2 — results from an unparseable manifest cannot be trusted, so
  the escape hatch deliberately does not cover it.

## PR 4 implementation notes (as built)

- `defineShared(deps, { context, role, mode })` exported from
  `@callstack/repack`: exact pins resolve from the installed packages (never
  committed literals or ranges), `eager` is the role+mode convention — host
  eager / remote federated-lazy / standalone all-eager — never an identity.
  `--standalone` reaches configs through `env.argv` only and is never
  persisted to any file.
- `repack-federation.json` is the committed workspace map —
  `{ host: { manifest, root? }, remotes: { name: { manifest, root?,
  standalone?, port? } } }`, strict schema, unknown keys invalid. It drives
  zero-flag `federation-doctor`, is the only workspace source for
  `federation-init` (no `--config` passthrough by design), and gates
  `--standalone`: a remote entry without `"standalone": true` is refused
  before compiling. `port` is declared for PR 5, unused today.
- Doctor extensions: `--dry-run` pre-build mode (package.json + bundler
  configs + workspace map only, every finding carries the unbuilt caveat),
  opt-in `--pairwise` (shared-only remote↔remote; native checks stay
  host↔remote), `EAGER_ADVISORY` warning for the host-eager/remote-lazy
  convention (only other eager splits remain `EAGER_MISMATCH` errors),
  host-native-first report ordering, no fail-fast.
- `federation-init <feature-folder> --name <remote>` scans the folder
  statically (dynamic imports → explicit non-exhaustive advisories),
  generates versionless `rspack.<remote>.mts` / `webpack.<remote>.mts`
  configs on `defineShared`, merges scanned deps ∩ host provides into the
  remote `package.json` at host versions, anchors the host `remotes`
  registration and the workspace-map entry — everything planned and diffed
  before any write, `--yes` pre-approves and auto-aligns divergent pins,
  re-runs are idempotent ("Nothing to do").
- RN CLI >= 17 positional contract: a command reading a positional argument
  must declare it in the command name (`federation-manifest [source]`,
  `federation-init [feature-folder]`) — otherwise commander passes the
  parsed options object as `argv[0]`. Command implementations additionally
  trust only string `argv[0]`. Dry-run config extraction also discovers
  tooling-style `rspack.<name>.*` configs when unambiguous, so
  init-scaffolded remotes are checkable without conventional filenames
  (apps keeping fully custom names, like the tester apps'
  `config.<app>.mts` pair in one directory, still need `--config`-style
  flows from the PR 5 runner).

## PR 5 implementation notes (as built)

- **Status surface is a terminal block, not a web dashboard (D10 deviation).**
  The design explored a browser status page; what shipped is a runner-owned
  fixed-height status block (`runnerConsole.ts`) redrawn only with
  cursor-up + erase-line sequences, coalesced to ~60 ms and only on content
  change. Rationale: zero new serving surface, the append-only prefixed log
  pane stays greppable, and CI (non-TTY) degrades to plain tables for free.
  `--json` carries the same state machine for machines.
- **Spawn shape resolved**: `react-native start --bundler <bundler>
  [--config …] --port <p> --no-interactive [--platform p] [--standalone]
  --no-reverse-port`. The `<bundler>-start` commands named in early drafts
  do not exist post-#1424; `start --bundler` is the supported path. The
  spec's "Plan resolution" wording was corrected to match at apply time.
  Children spawn as `process.execPath <resolved local cli.js> …` — PATH is
  never consulted (threat row "Subprocess spawn").
- **exit-hook NOT used despite the design naming it**: `exit-hook@4` is
  ESM-only and repack ships CJS — `require` would crash. Terminal restore
  rides `process.on('exit')` (fires for `process.exit()` too) + `finally`
  + idempotent `release()`. Same guarantee, no ESM interop risk.
- **Wizard fallback reads with a queueing line reader**:
  `readline/promises.question()` drops lines arriving while no question is
  pending (batch/piped input resolves only the first question) and never
  rejects on EOF — both hang a sequential prompt chain.
  `wizard.ts createLineReader` buffers `line` events and maps EOF to
  cancel. Verified empirically before adopting.
- `--dry-run` runs conflict probes read-only but allocates nothing;
  unmanaged ports display `auto` / JSON `null` (D4). Live ports are
  always numbers by spawn time.
- Drive-by shipped in `packages/dev-server`: `normalizeOptions` built
  `url` from the raw `options.port`, leaking `undefined` into every URL
  (and proxy targets) when `port` was omitted. Own commit, reverts alone.
- **Wizard chrome: clack ceiling + TUI guidance (for future terminal UIs).**
  `@clack/prompts@0.9.1` was verified to have NO prompt-level hint option
  (`hint` exists only per-option; `confirm`/`text` have none) and renders
  `message` strictly ABOVE the options list. A first attempt to add key
  legends by embedding them in the message therefore landed mid-flow —
  confusing — and was reverted (`a11f6f9e`); the wizard ships as plain
  clack. Rules learned, to reuse when a richer TUI is worth its cost:
  (1) keep chrome text out of `message`; legends belong under the options
  or under the banner, never between title and choices; (2) clack's
  dim-gray palette clashes with the runner's gradient banner — a custom
  prompt kit (frame `║`, `▸` cursor, bottom legend, repack purple/teal
  accents) built on the `runnerConsole` ownership primitives (bounded
  cursor redraw, resize, raw-mode lifecycle) is the upgrade path AND would
  drop `@clack/prompts` from repack's runtime deps (only `packages/init`
  would keep it), removing the maintainer-sign-off item; (3) the
  long-session ergonomics contract still applies to any prompt: static
  rows after commit, one owned redraw region, plain fallback off-TTY;
  (4) legends must describe the exact keymap rendered (D5 row F).
- Banner (`devHeader.ts`) shares one art/palette source with `logo.ts`;
  human mode prints the ASCII gradient + version line, CI/NO_COLOR prints
  one plain line, `--json` prints nothing (JSON stdout purity is pinned
  by a command test).

### Pre-PR hardening (post-audit)

- **Run guidance follows the final plan, not `args.platform`**: the
  effective platform is read back from the host's planned
  `--platform <p>`, so a wizard selection counts; with no platform
  selected the line names both `run-ios` and `run-android`.
- **Per-app react-native CLI**: `PlanInput.rnCliPath` became
  `rnCliForRoot(root)`; `federation-dev` memoizes resolution per distinct
  app root (single-dir twins still resolve once), `rnBin.ts` dropped the
  cwd/extraPaths fall-backs, and an unresolvable root exits 2 naming the
  owning app — no CLI is ever borrowed across apps.
- **`--config <path>`**: picks a specific `repack-federation.json`
  (resolved against the caller cwd); `loadFederationConfig` gained a
  `filePath` option and all anchoring lands on the file's directory;
  missing/invalid file exits 2 naming the path.
- **tester-federation-v2 adoption**: same map shape as v1
  (`HostApp`/`MiniApp`, configs `config.{host,mini}-app.mts`, ports
  8081/8082, `standalone: true` — its mini config reads
  `env.argv.standalone`), `start`/`start:dry` scripts;
  `federation-dev --dry-run --json` verified there.
- **Dead code**: supervisor's never-fired `'app-exit'` shutdown reason
  removed; docs state the shipped behavior — a dead child (host
  included) never ends the session; the user quits explicitly.

### App auto-launch (post-PR addition)

- **Readiness-gated one-shot launch**: on an explicit choice (`--launch`, or the wizard's confirm — single platform only, flags and wizard converging on `PlanInput.overrides.launch`), the supervisor spawns `run-<platform> --no-packager [--device <id>]` from the target app's root — the standalone remote's in a standalone session, the host's otherwise — the FIRST time that app's `/status` answers, streams it as `[launch]` through the same log pane, and kills it with the children on shutdown or session end. It is a first-class `spawnOneShot` on `DevSupervisor` but deliberately outside the tracked set: no status row, no respawn on later readiness flips, and it can never affect the session exit codes. `--no-packager` always: the session's dev servers ARE the packager — a second one would race for the port and serve outside the session.

## Referenced surface (verified 2026-09)

- `packages/repack/src/plugins/ModuleFederationPluginV1.ts` / `V2.ts` — no
  compiler hooks today; `apply()` is config-munging then delegates; hook taps
  go inside `apply()` gated on the option.
- `packages/repack/src/plugins/ManifestPlugin.ts:14-32` — emit pattern.
- `packages/repack/src/plugins/DevelopmentPlugin.ts:100-118` — resolved
  version read pattern.
- `packages/repack/src/commands/consts.ts:37-48` — dev-server asset allowlist.
- `packages/repack/src/modules/FederationRuntimePlugins/ResolverPlugin.ts:43-86`
  — existing runtime consumer of upstream `mf-manifest.json` (version-as-URL).

# `@callstack/repack-expo`

First-class Expo integration for Re.Pack and Rspack.

> This package is private while the Expo v1 release gates are being completed.
> The documented contract is implemented and validated in this repository, but
> the package is not published for application use yet.

## Requirements

- Expo SDK 56
- iOS or Android
- React Native New Architecture
- Hermes
- Rspack
- Node.js 20.12 or newer
- Expo prebuild or CNG

SDK 56 is the validated shape. The integration does not hard-code an Expo
version allowlist: it validates the required generated-native seams and fails
with recovery guidance when an Expo template is incompatible.

## Quick start

Run the initializer from the root of an existing Expo application with a static
`app.json` or `package.json#expo` configuration:

```sh
npx @callstack/repack-expo init
```

Run the dependency command printed by `init`, then regenerate the native
projects and validate the result:

```sh
npx expo prebuild --clean
npx @callstack/repack-expo doctor
```

Start Re.Pack in one terminal:

```sh
npm run repack:start
```

Build and launch the generated development application in another terminal:

```sh
npm run repack:ios
# or
npm run repack:android
```

The generated scripts use `expo run:* --no-bundler`. Do not start Metro or use
`expo start` for this workflow.

The initializer detects npm, yarn, pnpm and bun. Replace `npm run` in the
examples with the equivalent command for the application's package manager.

### Safe initializer modes

```sh
npx @callstack/repack-expo init --check
npx @callstack/repack-expo init --dry-run
npx @callstack/repack-expo init --dry-run --json
```

`--check` exits unsuccessfully when managed files are not current. `--dry-run`
returns the planned changes without writing them. `--json` produces
machine-readable diagnostics. An existing incompatible Rspack configuration is
never overwritten unless `--force` is explicitly supplied.

Executable `app.config.js`, `app.config.ts`, `app.config.mjs` and
`app.config.cjs` files are intentionally not rewritten. Convert the required
configuration to a static Expo config or apply the diagnostic's recovery steps
before rerunning `init`.

## What `init` manages

`init` updates only application-owned configuration files:

| File | Managed result |
| --- | --- |
| `package.json` | Adds compatible Re.Pack, Expo integration, Community CLI and Rspack development dependencies, plus `repack:start`, `repack:ios` and `repack:android` scripts. |
| `app.json` or `package.json#expo` | Registers `@callstack/repack-expo` and disables Expo Updates. SDK 56's removed `newArchEnabled` and `jsEngine` defaults are not written. |
| `react-native.config.js` | Registers the existing Re.Pack Rspack CLI commands. |
| `rspack.config.mjs` | Adds a minimal application config containing one `ExpoPlugin`. Existing compatible configs are preserved. |

The command never edits `ios/` or `android/`. Expo prebuild invokes the Config
Plugin and owns all generated native changes. Rerun prebuild after changing the
Config Plugin version or options; do not copy or maintain the generated Swift,
Objective-C, Kotlin, Gradle or Xcode snippets by hand.

The generated Rspack shape is intentionally small:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExpoPlugin } from '@callstack/repack-expo/rspack';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default (env) => {
  const {
    mode = 'development',
    platform = process.env.PLATFORM,
    devServer,
  } = env;

  if (platform !== 'ios' && platform !== 'android') {
    throw new Error('ExpoPlugin requires PLATFORM=ios or android');
  }

  return {
    context: projectRoot,
    devServer,
    mode,
    name: platform,
    output: {
      clean: true,
      path: path.join(projectRoot, 'build', 'rspack', platform),
      uniqueName: 'expo-app',
    },
    plugins: [new ExpoPlugin({ platform })],
  };
};
```

Do not add a separate `RepackPlugin`, application `setup.ts`, React Native
aliases, `extraChunks` configuration or ScriptManager resolver. `ExpoPlugin`
owns those Re.Pack defaults and rejects a duplicate `RepackPlugin`.

## Expo Router and plain entries

Expo Router applications keep the idiomatic entry:

```json
{
  "main": "expo-router/entry"
}
```

For native Rspack builds, `ExpoPlugin` replaces Router's Metro-only bootstrap
side effect and mounts the resolved Router application without importing the
Metro runtime.

A non-Router application can use any resolvable `package.json#main` entry. The
entry follows React Native platform extension precedence. Missing, ambiguous or
Metro-virtual entries fail before compilation instead of falling back to Metro.

Custom native entry and Rspack config paths are Config Plugin options:

```json
{
  "expo": {
    "plugins": [
      [
        "@callstack/repack-expo",
        {
          "entry": "src/main.ts",
          "configPath": "config/rspack.native.mjs"
        }
      ]
    ]
  }
}
```

`configPath` must resolve inside the Expo application when using `init`.
`entry` can be a project-relative or absolute resolvable path. `init`, prebuild
and `doctor` read the same options.

## Development and Fast Refresh

The development server is ordinary Re.Pack:

```sh
npm run repack:start
```

The generated iOS and Android Debug projects request the `index` bundle from
that server. `expo run:ios --no-bundler` and
`expo run:android --no-bundler` install and launch the native clients without
starting Metro.

Fast Refresh follows normal Re.Pack semantics. Updating a React component can
preserve parent and runtime state. Editing the application bootstrap or another
refresh boundary can trigger a full JavaScript reload. Source maps and Hermes
symbolication retain application source paths.

Expo Go, the `expo-dev-client` launcher/QR protocol and Expo development
manifests are not part of this integration.

## Local release builds

After prebuild, standard native Release builds invoke Community CLI's `bundle`
command. The registered Re.Pack commands dispatch that request to Rspack; no
separate JavaScript export command is required.

Typical local commands are:

```sh
npx expo run:ios --configuration Release --no-bundler
npx expo run:android --variant release --no-bundler
```

Xcode and Gradle remain responsible for Hermes compilation, final source-map
composition, native assets and application packaging. `expo export` is not a
Re.Pack release path.

## EAS Build

EAS must not run its eager Metro-compatible JavaScript step before the native
build. Add this environment variable to every Re.Pack EAS profile:

```json
{
  "build": {
    "production": {
      "env": {
        "EAS_BUILD_DISABLE_BUNDLE_JAVASCRIPT_STEP": "1"
      }
    }
  }
}
```

Then run the normal EAS command:

```sh
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

With CNG, EAS generates the absent native project and runs the registered
Config Plugin. If native projects are committed, run `expo prebuild --clean`
after every integration/config change and commit the regenerated projects
before EAS Build. Never reproduce the Config Plugin's native edits manually.

The repository's pnpm fixture additionally builds private workspace packages
in `postinstall` and disables the generic Expo doctor because that doctor
reports duplicate-module false positives for this workspace layout.
Applications consuming a published package do not need the private-workspace
build step. Disable the generic Expo doctor only if it reports that same pnpm
duplicate false positive, and use `npx @callstack/repack-expo doctor` to
validate the generated Re.Pack seams.

Expo Updates and EAS Update are unsupported in v1. `init` requires
`expo.updates.enabled` to be `false`; an EAS native build is required after
application, integration, dependency or native fingerprint changes.

## Assets, fonts and local chunks

`ExpoPlugin` installs Expo-compatible handling for static images, density
variants, fonts and XML resources. Existing compatible Rspack asset rules are
preserved. Android production fonts are emitted as raw resources so
`expo-asset` and `expo-font` can resolve their packaged resource identifiers.

Dynamic imports produce flat local chunks using `[name].chunk.bundle` by
default. Release builds embed those chunks in the application, and the existing
Re.Pack ScriptManager loads them from the application filesystem:

```tsx
const LazyCard = React.lazy(() => import('./LazyCard'));
```

Development chunks are loaded from the Re.Pack development server. Release
chunks do not require that server or an internet connection. Nested, constant
or otherwise colliding chunk filenames fail during configuration.

This packaged-local behavior remains the default when Module Federation v2 is
enabled. A host can therefore use a local `React.lazy()` component and remote
widgets in the same application without turning the local import into a remote
chunk.

## Module Federation v2

Module Federation is an explicit, application-owned Re.Pack capability. It is
not generated by `init` and does not add an Expo-specific runtime. Install the
`@module-federation/enhanced` version required by the application's Re.Pack
version, then use only the public Re.Pack v2 wrapper:

```sh
npm install @module-federation/enhanced
```

Do not instantiate `@module-federation/enhanced/rspack` directly. MF v1 and
Metro Module Federation are different runtimes and are not supported by this
integration.

### Configure the host

Keep the host's `ExpoPlugin` unchanged and add the ordinary Re.Pack v2 plugin.
The order of the two plugins does not matter:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ExpoPlugin } from '@callstack/repack-expo/rspack';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default (env) => {
  const {
    mode = 'development',
    platform = process.env.PLATFORM,
    devServer,
  } = env;

  if (platform !== 'ios' && platform !== 'android') {
    throw new Error('Expo host requires PLATFORM=ios or android');
  }

  const widgetManifest =
    `ExpoWidget@https://cdn.example.com/widgets/${platform}/mf-manifest.json`;

  return {
    context: projectRoot,
    devServer,
    mode,
    name: platform,
    output: {
      clean: true,
      path: path.join(projectRoot, 'build', 'rspack', platform),
      uniqueName: `expo-host-${platform}`,
    },
    plugins: [
      new ExpoPlugin({ platform }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'ExpoHost',
        dts: false,
        remotes: {
          ExpoWidget: widgetManifest,
        },
        shared: {
          react: { singleton: true, eager: true },
          'react-native': { singleton: true, eager: true },
          'expo-constants': { singleton: true, eager: true },
          'expo-asset': { singleton: true, eager: true },
          'expo-font': { singleton: true, eager: true },
        },
      }),
    ],
  };
};
```

The host leaves `ExpoPlugin.repack.extraChunks` absent, so the default local
chunk rule remains active. `ModuleFederationPluginV2` registers its remote
resolvers at normal Re.Pack priority, while the Expo local resolver remains a
fallback for unmatched application chunks. Both paths use the same
ScriptManager instance.

The host owns Expo Router and decides where the remote UI is mounted. A
widget can expose a component, screen or navigator, but its file routes are not
merged into the host's Router tree.

### Configure an Expo widget

An Expo widget is an independent Expo project with a normal synchronous entry
for standalone development and an MF v2 exposure. Its production config sends
the exposure, nested lazy chunks and remote assets to a deployable platform
directory:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ExpoPlugin } from '@callstack/repack-expo/rspack';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default (env) => {
  const {
    mode = 'development',
    platform = process.env.PLATFORM,
    devServer,
  } = env;

  if (platform !== 'ios' && platform !== 'android') {
    throw new Error('Expo widget requires PLATFORM=ios or android');
  }

  const remoteOutputPath = path.join(
    projectRoot,
    'build',
    'remote',
    platform
  );
  const remotePublicPath =
    `https://cdn.example.com/widgets/${platform}/remote-assets`;

  return {
    context: projectRoot,
    devServer,
    mode,
    name: platform,
    module: {
      rules:
        mode === 'production'
          ? Repack.getAssetTransformRules({
              remote: { publicPath: remotePublicPath },
            })
          : [],
    },
    output: {
      clean: true,
      path: path.join(projectRoot, 'build', 'rspack', platform),
      publicPath: `https://cdn.example.com/widgets/${platform}/`,
      uniqueName: `expo-widget-${platform}`,
    },
    plugins: [
      new ExpoPlugin({
        platform,
        repack: {
          output: { auxiliaryAssetsPath: remoteOutputPath },
          extraChunks: [
            { include: /.*/, type: 'remote', outputPath: remoteOutputPath },
          ],
        },
      }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: 'ExpoWidget',
        filename: 'ExpoWidget.container.js.bundle',
        exposes: { './Widget': './src/Widget' },
        dts: false,
        shared: {
          react: { singleton: true, eager: true },
          'react-native': { singleton: true, eager: true },
          'expo-constants': { singleton: true, eager: true },
          'expo-asset': { singleton: true, eager: true },
          'expo-font': { singleton: true, eager: true },
        },
      }),
    ],
  };
};
```

Passing `extraChunks` follows ordinary Re.Pack replacement semantics. The
widget intentionally replaces the packaged-local default so every nested
widget import is published remotely; the host does not pass this option and
keeps its own lazy chunks packaged.

A widget cannot deliver native dependencies. Every native module used by the
widget must already be installed and linked in the host binary, and its
JavaScript package must be shared compatibly. Adding or changing a native
dependency requires a new host native build. The existing Config Plugin remains
the sole owner of generated native changes, and Expo prebuild continues to
generate the native directories.

### Develop host and widget

The widget and host use existing Re.Pack CLI commands on separate ports. From
the widget project, start its remote development server:

```sh
npm run repack:start:remote
```

From the host project, start the normal server and launch the generated native
client:

```sh
npm run repack:start
npm run repack:ios
# or
npm run repack:android
```

The validated widget script maps `repack:start:remote` to
`react-native webpack-start --port 8082`. There is no Expo-specific widget CLI,
async bootstrap requirement or Metro server. Ordinary Re.Pack Fast Refresh and
reload boundaries apply.

### Load, fail and retry

Mount the exposure through the public MF v2 runtime:

```ts
import { loadRemote } from '@module-federation/enhanced/runtime';

const widgetModule = await loadRemote('ExpoWidget/Widget');
```

The application should immediately handle the returned promise, store a
rejection and throw that error during render into its own React error boundary.
Retry by starting a new `loadRemote()` attempt. This preserves the original
Module Federation or ScriptManager diagnostic for missing manifests, scripts
and nested chunks; widget image and font failures can use the same boundary.
Do not replace this path with a Webpack remote `import()` or a global error
handler.

### Build and deploy a widget

Build each platform independently with the standard Re.Pack `bundle` (or
`webpack-bundle`) command. The repository fixture exposes convenience scripts
that invoke those commands and prepare the publication tree:

```sh
npm run repack:build:production:ios
npm run repack:build:production:android
```

Publish separate `ios/` and `android/` trees. Each tree contains its own
`mf-manifest.json`, container/exposure scripts, nested lazy chunks, source maps,
density images and fonts. Point each host build at the matching platform
manifest; never serve an iOS widget graph to Android or vice versa. Host and
widget `EXPO_PUBLIC_*` values are compiled from their respective projects, so
do not use widget build-time variables as host runtime configuration.

Redeploying those remote artifacts is not Expo Updates or OTA. It does not
replace the host launch bundle or its packaged local chunks. Host JavaScript,
integration, dependency and native changes still require a new native build;
only MF v2 widget artifacts follow Re.Pack's remote manifest lifecycle.

Production remotes must use HTTPS. The fixture's Android cleartext exception
is limited to localhost and must not be copied for a public host. Optional
storage, update policy, retry, runtime plugins and code verification remain
ordinary Re.Pack configuration: use the existing ScriptManager storage and
locator APIs plus `CodeSigningPlugin` when required. `ExpoPlugin` adds no
parallel cache, signature, invalidation or security policy, and it does not
require an Expo-specific setup entry.

## Public environment variables

`ExpoPlugin` loads Expo-compatible dotenv files and inlines only static
`process.env.EXPO_PUBLIC_*` accesses in application modules. Shell values take
priority, followed by `.env.<mode>.local`, `.env.local`, `.env.<mode>` and
`.env`. Missing files are optional. Private values can participate in dotenv
expansion but are never passed to Babel or Rspack definitions.

Dot and string-literal bracket access are supported, including optional chains.
Computed variables, destructuring, assignments, private keys and accesses in
dependencies are left unchanged. `EXPO_NO_DOTENV=1` disables dotenv files while
retaining shell-provided public values. In production,
`EXPO_NO_CLIENT_ENV_VARS=1` disables public client injection entirely.

Changing or creating a selected dotenv file invalidates affected modules in
development. Changes to the launching shell environment require restarting the
Re.Pack development server.

## Migrating from Expo Metro

1. Create a migration branch and ensure the application has a static Expo
   config.
2. Run `npx @callstack/repack-expo init --dry-run` and review the managed-file
   changes.
3. Run `init`, execute its printed dependency command and run
   `npx expo prebuild --clean`.
4. Run `npx @callstack/repack-expo doctor`.
5. Replace `expo start` with `repack:start`; launch native clients through the
   generated `repack:ios` and `repack:android` scripts.
6. Exercise development, Fast Refresh and both native Release builds before
   removing an existing production path.

`init` does not delete `metro.config.js`; Re.Pack simply does not read it. Keep
the file only if another unsupported Expo/Metro workflow still needs it. This
migration does not automatically enable federation and does not provide Expo
CLI bundler parity, OTA parity, Metro Module Federation, MF v1 or raw enhanced
plugin support. Add the application-owned MF v2 configuration above only after
the non-federated Re.Pack path is working.

## Troubleshooting

Start with the read-only doctor:

```sh
npx @callstack/repack-expo doctor
npx @callstack/repack-expo doctor --json
```

| Symptom or diagnostic | Recovery |
| --- | --- |
| `DYNAMIC_EXPO_CONFIG` | Use static `app.json`/`package.json#expo`, or apply the reported configuration manually before prebuild. The CLI will not execute application config code. |
| `RSPACK_CONFIG_CONFLICT` | Preserve and update the existing config, or explicitly allow replacement with `init --force`. Keep only one `ExpoPlugin` and no separate `RepackPlugin`. |
| New Architecture or Hermes conflict | Remove `newArchEnabled: false` or a non-Hermes `jsEngine` override. SDK 56 supplies the supported defaults when those fields are absent. |
| Expo Updates conflict | Set `expo.updates.enabled` to `false` and regenerate the native projects. OTA is not supported. |
| Development client requests Metro or cannot find `index.bundle` | Rerun prebuild, start `repack:start`, launch with `repack:ios`/`repack:android`, and verify the generated Re.Pack commands with `doctor`. |
| ScriptManager autolinking cannot be verified | Install dependencies, run a clean prebuild, install iOS pods when applicable, then rerun `doctor`. Do not add another native ScriptManager module. |
| A Release lazy import fails | Confirm the chunk has a flat unique filename, rebuild the native application and inspect the underlying Rspack chunk-loader diagnostic. |
| An MF v2 widget fails to load | Preserve the original MF/ScriptManager error in a host-owned boundary, verify the platform manifest and remote artifact URLs, restore the remote, then start a new `loadRemote()` attempt. |
| An Android production widget works only over HTTP | Deploy the manifest, scripts and assets over HTTPS. The generated application does not allow arbitrary cleartext hosts. |
| An Android packaged font cannot load | Clean and rebuild with the current `ExpoPlugin`; do not add an application-owned font-copy workaround. |
| EAS attempts Metro/`export:embed` | Set `EAS_BUILD_DISABLE_BUNDLE_JAVASCRIPT_STEP=1` on the selected EAS profile and rebuild. |

## Support matrix

| Capability | V1 status |
| --- | --- |
| Expo SDK 56 | Supported and validated; newer template shapes are accepted only when all required seams validate. |
| iOS and Android native applications | Supported. |
| Rspack | Supported. |
| Webpack | Unsupported. |
| New Architecture and Hermes | Required; SDK 56 defaults do not need explicit app-config fields. |
| Expo Router | Supported. |
| Resolvable plain `package.json#main` entry | Supported. |
| Expo prebuild/CNG | Supported and required. |
| Direct native development and Fast Refresh | Supported through Re.Pack and `expo run:* --no-bundler`. |
| Local native Release and EAS Build | Supported. |
| Expo Modules, images, density variants, fonts and source maps | Supported. |
| Expo-compatible `EXPO_PUBLIC_*` environment variables | Supported. |
| Monorepo and pnpm workspace resolution | Supported. |
| Packaged local chunks through ScriptManager | Supported. |
| Re.Pack Module Federation v2 | Supported as explicit application-owned configuration. |
| Expo host -> Expo widget | Supported and validated on iOS and Android. |
| Expo host -> ordinary Re.Pack MF v2 widget | Supported and validated. |
| Production MF v2 widget artifacts | Supported as platform-specific remote deployments. |
| Ordinary Re.Pack host -> Expo widget | Unsupported; the Expo native contract is not guaranteed. |
| Module Federation v1 or raw `@module-federation/enhanced/rspack` | Unsupported. |
| Metro Module Federation or `@module-federation/metro` | Unsupported. |
| Generic remote chunks outside MF v2 | Unsupported by the Expo integration contract. |
| Expo Go | Unsupported. |
| `expo-dev-client` launcher, QR discovery and development manifests | Unsupported. |
| `expo start` or `expo export` as Re.Pack commands | Unsupported. |
| Expo Updates, EAS Update and OTA | Unsupported. |
| Metro bundler integration | Unsupported. |
| Old Architecture or JSC | Unsupported. |
| Web, SSR, React Server Components and DOM Components | Unsupported. |
| Executable `app.config.*` mutation | Unsupported; static Expo config is required by `init`. |

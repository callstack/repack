# Federation Manifest

Running Module Federation across several apps means host and remotes live in
different repos, get upgraded at different times, and share dependencies that
have to agree on versions. Today nothing checks that agreement. A shared
package upgraded on one side, or a native module that only the host ships,
shows up as a crash in production. The federation manifest is the first tool
for catching that before release: at build time, Re.Pack writes a JSON file
describing what the container actually contains, and you can diff it against
the other side.

The option is opt-in. Without it, nothing about your build output changes.

## Enabling it

Add `manifest: true` to either `ModuleFederationPlugin` version:

```ts
// webpack.config.mts
new Repack.plugins.ModuleFederationPlugin({
  name: 'catalog',
  exposes: {
    './Home': './src/Home',
  },
  shared: {
    react: { singleton: true, eager: true },
    'react-native': { singleton: true, eager: true },
    'react-native-svg': { singleton: true },
  },
  manifest: true,
});
```

The build now emits an extra file, `repack-federation-manifest.json`, next to
your bundles in the output directory. The development server serves it too, at
`http://localhost:8081/repack-federation-manifest.json`, so you can inspect a
running container with `curl | jq`.

## Options

| Option           | Type      | Default                          | Description                                          |
| ---------------- | --------- | -------------------------------- | ---------------------------------------------------- |
| `fileName`       | `string`  | `repack-federation-manifest.json`| Asset name of the emitted file                       |
| `filePath`       | `string`  | output root                      | Subdirectory of the build output to emit into        |
| `nativeAnalysis` | `boolean` | `true`                           | Scan the module graph for native modules             |

```ts
manifest: {
  fileName: 'catalog-manifest.json',
  filePath: 'federation',
}
```

With `nativeAnalysis: false`, the `reactNative.nativeModules` list stays empty
and the manifest says so in its `note` field. Use it if the scan is too slow
for your setup or you do not care about the native block yet.

## What the manifest looks like

A trimmed example from a remote called `catalog`:

```json
{
  "manifestVersion": 1,
  "id": "catalog",
  "name": "catalog",
  "metaData": {
    "name": "catalog",
    "globalName": "catalog",
    "type": "remote",
    "buildInfo": { "buildVersion": "1a2b3c4", "buildName": "catalog" },
    "remoteEntry": { "name": "catalog.container.bundle", "path": "", "type": "var" },
    "publicPath": "auto"
  },
  "shared": [
    {
      "name": "react",
      "version": "19.1.0",
      "singleton": true,
      "eager": true,
      "requiredVersion": "*"
    },
    {
      "name": "react-native-svg",
      "version": "15.11.2",
      "singleton": true,
      "eager": false,
      "requiredVersion": "*"
    }
  ],
  "remotes": [],
  "exposes": [{ "id": "catalog:Home", "name": "Home", "path": "./Home" }],
  "reactNative": {
    "version": "0.80.1",
    "platforms": ["ios", "android"],
    "nativeModules": [
      {
        "package": "react-native-svg",
        "version": "15.11.2",
        "turboModule": false,
        "confidence": "static"
      }
    ],
    "dynamicImportDetected": false
  }
}
```

Two details are worth calling out.

The `version` in each `shared` entry is the version installed in your
`node_modules`, resolved at build time. Your config may say
`requiredVersion: '*'` (the default in both plugins), and the manifest reports
what that star actually resolved to. That is the number you want when checking
host against remote.

`metaData` follows the shape of the upstream Module Federation 2.0
`mf-manifest.json`, so tooling written against that spec can read the common
fields. The `reactNative` block is the Re.Pack-specific addition, and
`manifestVersion` is the compatibility contract for anyone consuming the file.

## How native modules are detected

The scan walks every module in the compilation, finds the ones that resolved
inside `node_modules`, and asks a question about the owning package: does it
have an `ios/` or `android/` directory, or a `codegenConfig`, or a
`react-native.config.js`, or the `react-native` keyword? Direct evidence
(native folders, codegen config) gets `confidence: "static"`. Keyword or
config-file presence gets `confidence: "heuristic"`.

There is a hole in every static scan: `require(someVariable)` with a computed
path. When webpack or Rspack reports one (the "Critical dependency" warning),
the manifest sets `dynamicImportDetected: true` and every entry drops to
`heuristic`, because the list can no longer claim to be complete. Treat the
list as "verify these", never as a green checkmark.

A note on `mf-manifest.json`: the `@module-federation/enhanced` plugin that
`ModuleFederationPluginV2` wraps emits its own `mf-manifest.json` with its own
defaults. The `manifest` option here belongs to Re.Pack, controls only the
`repack-federation-manifest.json` file, and is not forwarded to the wrapped
plugin. The two files coexist.

## Where this is going

The manifest is the base primitive for a set of federation tools. The follow-up
work is a `repack federation` CLI: one command to pretty-print a manifest from
a file or URL, and a doctor that takes a host plus its remotes and reports
version drift, singleton or eager mismatches, and native modules the host does
not declare, with exit codes you can run as a CI gate.

Adopt it today by turning the flag on in host and remotes and keeping the
output next to your bundles. Even before the doctor lands, the diff between
two manifests you can read with your eyes is already hard to argue with.

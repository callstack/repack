# AssetsLoader

The `AssetsLoader` processes image and other static assets (video, audio, etc.) in your React Native application. It handles asset extraction, copying files to the appropriate platform-specific output directories, and supports additional features like base64 inlining and conversion into remote assets.

:::info Platform-Specific Output
By default, extracted asset files are copied to:

- iOS: `assets/` directory
- Android: `drawable-*` directories

This matches Metro's asset handling behavior. The default [Webpack template](../configuration/templates) is configured to process the same asset types as Metro.
:::

:::tip Guides related to AssetsLoader
Looking to do more with your assets? Check out the guides on:

- [Inlining assets as base64 strings](../guides/inline-assets)
- [Converting to remote assets](../guides/remote-assets)
- [Adding SVG support](../guides/svg)

:::

## Options

```ts
type AssetsLoaderOptions = {
  platform: string;
  scalableAssetExtensions?: string[];
  scalableAssetResolutions?: string[];
  devServerEnabled?: boolean;
  inline?: boolean;
  publicPath?: string;
  remote?: {
    enabled: boolean;
    publicPath: string;
    assetPath?: (args: {
      resourcePath: string;
      resourceFilename: string;
      resourceDirname: string;
      resourceExtensionType: string;
    }) => string;
  };
};
```

### platform

- Type: `string`
- Required

Target platform (e.g. `ios` or `android`).

### scalableAssetExtensions

- Type: `string[]`
- Default: `SCALABLE_ASSETS`

Array of file extensions that support scaling suffixes (`@1x`, `@2x` etc).

### scalableAssetResolutions

- Type: `string[]`
- Default: `SCALABLE_RESOLUTIONS`

Array of supported resolution scales.

### devServerEnabled

- Type: `boolean`
- Default: `undefined`

Whether development server is enabled.

### inline

- Type: `boolean`
- Default: `undefined`

When true, assets will be inlined as base64 in the JS bundle instead of being extracted to separate files.

### publicPath

- Type: `string`
- Default: `undefined`

Public path for local asset URLs.

### remote.enabled

- Type: `boolean`
- Default: `undefined`

When true, assets will be converted to remote assets meant to be served from a CDN or external server.

### remote.publicPath

- Type: `string`
- Default: Required if remote.enabled

Base URL where remote assets will be hosted (must start with http/https). For example: `https://cdn.example.com`.

### remote.assetPath

- Type: `(args: { resourcePath: string; resourceFilename: string; resourceDirname: string; resourceExtensionType: string; }) => string`
- Default: `undefined`

Custom function to control how remote asset paths are constructed. Applied to both generated folder paths and URLs.

## Example

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = (env) => {
  const { platform = process.env.PLATFORM, devServer = undefined } = env;

  module.exports = {
    module: {
      rules: [
        {
          test: Repack.getAssetExtensionsRegExp(Repack.ASSET_EXTENSIONS),
          use: {
            loader: "@callstack/repack/assets-loader",
            options: {
              platform,
              devServerEnabled: Boolean(devServer),
            },
          },
        },
      ],
    },
  };
};
```

## Excluding Assets

You can exclude specific asset types from being processed by the `AssetsLoader`. This is useful when you want to use a different loader for certain file types (e.g., SVG files)

:::tip
You can use any combination of `test`, `include`, and `exclude` in your rules to control which assets are processed by which loader.
:::

Here's how to exclude `.svg` files and process them with a custom loader instead:

```js title="webpack.config.js"
module.exports = {
  module: {
    rules: [
      // Process all assets except SVGs with AssetsLoader
      {
        test: Repack.getAssetExtensionsRegExp(
          Repack.ASSET_EXTENSIONS.filter((ext) => ext !== "svg")
        ),
        use: {
          loader: "@callstack/repack/assets-loader",
          options: { platform },
        },
      },
      // Process SVGs with a custom loader
      {
        test: /\.svg$/,
        use: "your-custom-svg-loader",
      },
    ],
  },
};
```

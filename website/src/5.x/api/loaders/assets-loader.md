# AssetsLoader

The `AssetsLoader` processes image and other static assets (video, audio, etc.) in your React Native application. It handles asset extraction, copying files to the appropriate platform-specific output directories, and supports additional features like base64 inlining and conversion into remote assets.

:::info Platform-Specific Output
By default, extracted asset files are copied to `assets/` directory for iOS and `drawable-*` directories (e.g. `drawable-mdpi`, `drawable-hdpi`, etc.) for Android which matches Metro's asset handling behavior.
:::

:::tip Guides related to AssetsLoader
Looking to do more with your assets? Check out the guides on:

- [Inlining assets as base64 strings](../guides/inline-assets)
- [Converting to remote assets](../guides/remote-assets)
- [Adding SVG support](../guides/svg)

:::

## Options

```ts
interface AssetsLoaderOptions {
  platform?: string;
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
}
```

### platform

- Type: `string`
- Default: `compiler.options.name`

Target platform (e.g. `ios` or `android`). The default value is the name of the compiler which Re.Pack sets to the target platform.

### scalableAssetExtensions

- Type: `string[]`
- Default: `SCALABLE_ASSETS`

Array of file extensions that support scaling suffixes (`@1x`, `@2x` etc).

See [SCALABLE_ASSETS](/api/utils/constants#scalable_assets) for a list of extensions supported by default.

### scalableAssetResolutions

- Type: `string[]`
- Default: `SCALABLE_RESOLUTIONS`

Array of supported resolution scales.

See [SCALABLE_RESOLUTIONS](/api/utils/constants#scalable_resolutions) for a list of resolutions supported by default.

### devServerEnabled

- Type: `boolean`
- Default: `undefined`

Whether development server is enabled. By default, this option is determined by checking if `compiler.options.devServer` is defined.

### inline

- Type: `boolean`
- Default: `false`

When true, assets will be inlined as base64 in the JS bundle instead of being extracted to separate files.

### publicPath

- Type: `string`
- Default: `undefined`

Public path for local asset URLs.

### remote

- Type: `object`

Configuration for remote asset handling.

#### remote.enabled

- Type: `boolean`
- Required: `true`

When true, assets will be converted to remote assets meant to be served from a CDN or external server.

#### remote.publicPath

- Type: `string`
- Required: `true`

Base URL where remote assets will be hosted. Must start with `http://` or `https://`.

#### remote.assetPath

- Type: `Function`
- Default: `undefined`

Custom function to control how remote asset paths are constructed. Applied to both generated folder paths and URLs.

Function parameters:

- `resourcePath`: string - Full path to the resource
- `resourceFilename`: string - Filename of the resource
- `resourceDirname`: string - Directory name of the resource
- `resourceExtensionType`: string - Extension type of the resource

## Example

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [
      {
        test: Repack.getAssetExtensionsRegExp(),
        use: "@callstack/repack/assets-loader",
      },
    ],
  },
};
```

## Excluding Assets

You can exclude specific asset types from being processed by the `AssetsLoader`. This is useful when you want to use a different loader for certain file types (e.g. `.svg` files)

Here's how to exclude `.svg` files and process them with a custom loader instead:

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [
      // Process all assets except SVGs with AssetsLoader
      {
        test: Repack.getAssetExtensionsRegExp(
          Repack.ASSET_EXTENSIONS.filter((ext) => ext !== "svg")
        ),
        use: "@callstack/repack/assets-loader",
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

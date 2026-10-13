# AssetsLoader

The `AssetsLoader` processes image and other static assets (video, audio, etc.) in your React Native application. It handles asset extraction, copying files to the appropriate platform-specific output directories, and supports additional features like base64 inlining and conversion into remote assets.

:::info Platform-Specific Output
By default, extracted asset files are copied to `assets/` directory for iOS and to Android resource directories for Android, which matches Metro's asset handling behavior.
:::

### Android resource directories

When bundling for Android without the development server, extracted assets are placed in the following resource directories:

| Asset                                                                                   | Output directory                                               |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Images (`png`, `jpg`, `jpeg`, `gif`, `webp`)                                            | `drawable-*` (e.g. `drawable-mdpi`, `drawable-hdpi`) per scale |
| Font binaries (`ttf`, `otf`, `ttc`)                                                     | `font` **and** `raw`                                           |
| XML font families (`<font-family>`)                                                     | `font`                                                         |
| Other XML files                                                                         | `drawable-*`                                                   |
| Everything else (other image formats such as `bmp` or `svg`, video, audio, other files) | `raw`                                                          |

`xml` and `ttc` are not included in the default [asset extensions](/api/utils/constants#asset_extensions), so `getAssetTransformRules()` doesn't process them. To bundle them, add a rule that uses the Assets loader for these extensions.

Font binaries are emitted twice: the `font` copy keeps native references such as `@font/...` and `R.font` working, while the `raw` copy lets libraries that load fonts by name at runtime (e.g. [React Native Skia](https://shopify.github.io/react-native-skia/)) find them the same way they do with Metro.

Re.Pack also generates `raw/keep.xml` listing all bundled Android resources. Assets loaded by name from JavaScript are invisible to the resource shrinker, so this file keeps them in the APK when `shrinkResources` is enabled.

:::note
Development server builds and [remote assets](/docs/guides/remote-assets) are not copied into Android resource directories, so the layout above and `keep.xml` don't apply to them.
:::

:::tip Guides related to AssetsLoader
Looking to do more with your assets? Check out the guides on:

- [Inlining assets as base64 strings](/docs/guides/inline-assets)
- [Converting to remote assets](/docs/guides/remote-assets)
- [Adding SVG support](/docs/guides/svg)
- [Using custom fonts](/docs/guides/fonts)

:::

## Options

```ts
type AssetPathArgs = {
  resourcePath: string;
  resourceFilename: string;
  resourceDirname: string;
  resourceExtensionType: string;
};

type AssetPathFn = (args: AssetPathArgs) => string;

interface AssetsLoaderOptions {
  platform?: string;
  scalableAssetExtensions?: string[];
  scalableAssetResolutions?: string[];
  devServerEnabled?: boolean;
  inline?: boolean;
  maxInlineSize?: number;
  publicPath?: string;
  remote?: {
    enabled: boolean;
    publicPath: string;
    assetPath?: AssetPathFn;
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

### maxInlineSize

- Type: `number`
- Default: `undefined`

File size threshold in bytes used together with `inline: true`. Assets whose largest scale variant is smaller than or equal to this value will be inlined; larger assets will be extracted as separate files. Has no effect when `inline` is not `true`.

The threshold is compared against the **largest scale variant** (e.g. `@3x`), not the `@1x` file — when an asset is inlined, all scale variants are embedded into the bundle.

:::tip
Learn more about size-based inlining in the [Inlining Assets guide](/docs/guides/inline-assets#size-based-inlining).
:::

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

- Type: `(args: AssetPathArgs) => string`
- Default: `undefined`

Custom function to control how remote asset paths are constructed. Applied to both generated folder paths and URLs.

```ts
type AssetPathArgs = {
  resourcePath: string;
  resourceFilename: string;
  resourceDirname: string;
  resourceExtensionType: string;
};
```

```js
{
  remote: {
    enabled: true,
    publicPath: 'https://cdn.example.com',
    assetPath: ({ resourceFilename }) => `assets/${resourceFilename}`
  }
}
```

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

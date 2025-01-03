# Configuration utilities

## Constants

### SCALABLE_ASSETS

Array of file extensions for scalable image assets.

```ts
type SCALABLE_ASSETS = string[];
```

Contains the following extensions: `bmp`, `gif`, `jpg`, `jpeg`, `png`, `psd`, `svg`, `webp`, `tiff`.

### SCALABLE_RESOLUTIONS

Array of supported asset resolutions.

```ts
type SCALABLE_RESOLUTIONS = string[];
```

Contains the following resolutions: `0.75`, `1`, `1.5`, `2`, `3`, `4`.

### ASSET_EXTENSIONS

Array of all supported asset extensions.

```ts
type ASSET_EXTENSIONS = string[];
```

Contains all extensions from `SCALABLE_ASSETS` plus additional extensions for:

- Video formats: `m4v`, `mov`, `mp4`, `mpeg`, `mpg`, `webm`
- Audio formats: `aac`, `aiff`, `caf`, `m4a`, `mp3`, `wav`
- Document formats: `html`, `pdf`, `yaml`, `yml`
- Font formats: `otf`, `ttf`
- Other: `zip`, `obj`

## getAssetExtensionsRegExp

Creates a RegExp from an array of asset extensions.

### Parameters

```ts
type GetAssetExtensionsRegExp = (extensions?: string[]) => RegExp;
```

#### extensions

- Type: `string[]`
- Required: `false`
- Default: `ASSET_EXTENSIONS`

Array of extensions to include in the RegExp pattern.

### Example

```js title=rspack.config.cjs
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [
      {
        test: Repack.getAssetExtensionsRegExp(Repack.ASSET_EXTENSIONS),
        use: {
          loader: "@callstack/repack/assets-loader",
          options: { platform },
        },
      },
    ],
  },
};
```

## getDirname

Convert a `file:///` URL to an absolute directory path. This utility is particularly useful in ESM Rspack/Webpack configs where `__dirname` is not available.

### Parameters

```ts
type GetDirname = (fileUrl: string) => string;
```

#### fileUrl

- Type: `string`
- Required: `true`

The `file:///` URL of a module, typically obtained from `import.meta.url`.

### Example

```js title=rspack.config.mjs
import * as Repack from "@callstack/repack";

export default (env) => {
  const { context = Repack.getDirname(import.meta.url) } = env;

  return {
    // ... config
  };
};
```

## getModulePaths

A helper function that generates regular expressions for matching module paths across different package manager formats (npm, yarn, pnpm, bun). You can use these regex patterns in your Rspack/webpack configuration to properly resolve modules regardless of which package manager you use.

### Parameters

```ts
type GetModulePaths = (moduleNames: string[]) => RegExp[];
```

#### moduleNames

- Type: `string[]`
- Required: `true`

Array of module names to generate path patterns for.

### Example

```js title=rspack.config.cjs
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [
      {
        include: Repack.getModulePaths([
          "react-native",
          "react-native-macos",
          "react-native-windows",
        ]),
      },
    ],
  },
};
```

## getPublicPath

Get Rspack/webpack public path value based on the provided configuration. Returns a URL for development server or a noop URL for production builds.

### Parameters

```ts
type GetPublicPath = (options?: {
  platform: string;
  devServer?: DevServerOptions;
}) => string;
```

#### options.platform

- Type: `string`
- Required: `true`

Target application platform.

#### options.devServer

- Type: `DevServerOptions`
- Required: `false`

Development server configuration options.

### Example

```js title=rspack.config.cjs
const Repack = require("@callstack/repack");

module.exports = (env) => {
  const { platform, devServer = undefined } = env;

  return {
    output: {
      publicPath: Repack.getPublicPath({ platform, devServer }),
    },
  };
};
```

## getResolveOptions

Get resolve options preset to properly resolve files within the project. The preset matches closely Metro's behavior.

- resolve platform extensions (e.g. `file.ios.js`)
- resolve native extensions (e.g. `file.native.js`)
- optionally use package exports (`exports` field in `package.json`) instead of main fields (e.g. `main` or `browser` or `react-native`)

### Parameters

```ts
type GetResolveOptions = (
  platform: string,
  options: {
    enablePackageExports?: boolean;
    preferNativePlatform?: boolean;
  }
) => ResolveOptions;
```

#### platform

- Type: `string`
- Required: `true`

Target application platform (e.g. `ios` or `android`).

#### options.enablePackageExports

- Type: `boolean`
- Default: `false`

Whether to enable Package Exports support. When enabled, uses the `exports` field in `package.json` instead of main fields.

:::warning
Package Exports support differs significantly between Metro and Re.Pack. Since this option is still marked as experimental in Metro, it's recommended to avoid using in Re.Pack for best compatbility.

For more details, please refer to the [Module Resolution guide](../guides/module-resolution).
:::

#### options.preferNativePlatform

- Type: `boolean`
- Default: `true`

Whether to prefer native platform over generic platform when resolving extensions. When enabled, Re.pack will try `.native.${ext}` before `.${ext}` and after `.${platform}.${ext}` during resolution.

:::info
This matches Metro's [preferNativePlatform](https://metrobundler.dev/docs/resolution#prefernativeplatform-boolean) behavior.
:::

### Example

```js title=rspack.config.cjs
const Repack = require("@callstack/repack");

module.exports = (env) => {
  const { platform } = env;

  return {
    resolve: {
      ...Repack.getResolveOptions(platform, {
        enablePackageExports: false,
        preferNativePlatform: true,
      }),
    },
  };
};
```

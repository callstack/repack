# getAssetTransformRules

A helper function that generates `module.rules` configuration for handling assets in React Native applications.

:::tip
This helper function allows you to create a single configuration for all assets in your project. If you need more granular control over asset processing, refer to the [`assetsLoader`](/api/loaders/assets-loader) documentation.
:::

## Parameters

```ts
interface GetAssetTransformRulesOptions {
  inline?: boolean;
  remote?: {
    publicPath: string;
    assetPath?: (args: {
      resourcePath: string;
      resourceFilename: string;
      resourceDirname: string;
      resourceExtensionType: string;
    }) => string;
  };
  svg?: "svgr" | "xml" | "uri" | { type: "svgr", options: Record<string, any> };
}
```

### options

Configuration options for asset transformations.

### options.inline

- Type: `boolean`

Whether to inline assets as base64 URIs.

:::tip
Learn more about the inlining assets in the [Inlining Assets guide](/docs/guides/inline-assets).
:::

### options.remote

- Type: `object`

Configuration for remote asset loading.

:::tip
Learn more about using remote assets in the [Remote Assets guide](/docs/guides/remote-assets).
:::

### options.remote.publicPath

- Type: `string`
- Required: `true`

Public path for loading remote assets.

See [`assetsLoader` documentation](/api/loaders/assets-loader#remotepublicpath) for reference.

### options.remote.assetPath

- Type: `(args: { resourcePath: string; resourceFilename: string; resourceDirname: string; resourceExtensionType: string; }) => string`

A function to customize how the asset path is generated for remote assets.

See [`assetsLoader` documentation](/api/loaders/assets-loader#remoteassetpath) for reference.

### options.svg

- Type: `'svgr' | 'xml' | 'uri' | { type: "svgr", options: Record<string, any>}`

Determines how SVG files should be processed:

- `'svgr'`: Uses `@svgr/webpack` to transform SVGs into React Native components
  - `type: "svgr"`: Uses `@svgr/webpack` to transform SVGs into React Native components and allows to configure additional options to `@svgr/webpack`.
- `'xml'`: Loads SVGs as raw XML source to be used with `SvgXml` from `react-native-svg`
- `'uri'`: Loads SVGs as inline URIs to be used with `SvgUri` from `react-native-svg`

#### options.svg.options

- Type: `Record<string, any>`

Allows to configure additional options to `@svgr/webpack`. The full list of available options can be found in the [svgr doc](https://react-svgr.com/docs/options/).

:::tip
Learn more about using SVG in the [SVG guide](/docs/guides/svg).
:::

## Example

```js title=rspack.config.cjs
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [
      ...Repack.getAssetTransformRules({
        svg: "svgr",
      }),
    ],
  },
};
```

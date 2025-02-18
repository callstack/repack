# getAssetExtensionsRegExp

Creates a RegExp from an array of asset extensions.

## Parameters

```ts
type GetAssetExtensionsRegExp = (extensions?: string[]) => RegExp;
```

### extensions

- Type: `string[]`
- Default: `ASSET_EXTENSIONS`

Array of extensions to include in the RegExp pattern.

## Example

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

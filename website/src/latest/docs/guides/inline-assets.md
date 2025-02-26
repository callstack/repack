# Inlining assets

There are some situations when you might want to inline assets into the JavaScript bundle, instead of extracting them into standalone files.

Common examples of such use cases are:

- Using assets inside of [Module Federation remotes](/docs/features/module-federation) where you can't have assets extracted and shipped with the host app bundle.
- Out-of-tree platforms that don't support static assets in a similar way as React Native on iOS/Android does or don't support static assets at all.

:::tip title="Use sparingly and only when necessary"

Inlining assets into the bundle makes the **bundle size larger** and increases the **initial startup time** of an app. It's most noticable when you inline an asset which has 3 scales (e.g. `@1x`, `@2x` and `@3x`). In that scenario, all of the scales will be inlined into the bundle since it's not possible to determine which scale is needed at runtime.

:::

## Usage

To inline assets you have to pass `inline: true` option to the [Assets loader](/api/loaders/assets-loader):

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [
      {
        test: Repack.getAssetExtensionsRegExp(),
        use: {
          loader: "@callstack/repack/assets-loader",
          options: { inline: true },
        },
      },
    ],
  },
};
```

You can also use the `inline: true` option in the [getAssetsTransformRules](/api/utils/get-asset-transform-rules) helper function:

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [...Repack.getAssetsTransformRules({ inline: true })],
  },
};
```

This will cause all assets processed by Assets loader in the rule to be inlined into the JavaScript bundle.

Inlined assets are imported in the same way as extracted assets:

```jsx
import image from './image.png';

<Image source={image} />
// or
<Image source={require('./image.png')} />
```

The value of `image` in this example would be either an object with `uri`, `width`, `height` and `scale` or an array of such objects, in case there are multiple scales.

## Selective inlining

You can provide multiple rules with Re.Pack's [Assets loader](/api/loaders/assets-loader) - one rule would extract the assets and another would inline them. There's no limit how many of these rules you could have.

Make sure you configure those rules not to overlap, so that any single asset is only processed by one rule (by one [Assets loader](/api/loaders/assets-loader)). Use combination of `include`, `exclude` and `test` (for extensions matching) to configure each rule.

```js title="rspack.config.mjs"
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [
      // only assets in the inlineAssets folder should be inlined
      {
        test: Repack.getAssetExtensionsRegExp(),
        include: [path.join(context, "src/assetsTest/inlineAssets")],
        use: {
          loader: "@callstack/repack/assets-loader",
          options: { inline: true },
        },
      },
      // treat all other assets like native assets
      {
        test: Repack.getAssetExtensionsRegExp(),
        exclude: [path.join(context, "src/assetsTest/inlineAssets")],
        use: "@callstack/repack/assets-loader",
      },
    ],
  },
};
```

:::tip title="Learn more about loader rules"

You can read more about loader rules and how to configure them in:

- [Rspack Module Rules documentation](https://rspack.dev/config/module.html#modulerules)
- [Webpack Module Rules documentation](https://webpack.js.org/configuration/module/#modulerules)

:::

# Assets loader

Assets loader allows you use images and reference other static assets (video, audio, etc) inside your application.

In the default [Webpack template](/docs/configuration/webpack-config#webpack-config-template), the Assets loader is configured to process the same assets types as Metro:

```js
// webpack.config.js
module.exports = {
  // ...
  module: {
    // ...
    rules: [
      // ...
      {
        test: ReactNative.getAssetExtensionsRegExp(
          ReactNative.ASSET_EXTENSIONS
        ),
        use: {
          loader: '@callstack/repack/assets-loader',
          options: {
            platform,
            devServerEnabled: devServer.enabled,
            /**
             * Defines which assets are scalable - which assets can have
             * scale suffixes: `@1x`, `@2x` and so on.
             * By default all images are scalable.
             */
            scalableAssetExtensions: ReactNative.SCALABLE_ASSETS,
          },
        },
      },
    ],
    // ...
  },
  // ...
};
```

:::info

Assets loader should be used in combination with [AssetsResolverPlugin](/docs/api/node/classes/AssetsResolverPlugin)
to work correctly and process scales: `@1x`, `@2x` and so on.

:::

## Excluding assets

In some cases, you might want to exclude assets from being processed by Re.Pack's Assets loader.
A typical scenario would be if you want to manually process specific assets separately using
different loaders — a common example of such scenario would be SVGs.

You can exclude asset types by filtering the out from `ASSET_EXTENSIONS` array:
```js
// webpack.config.js
module.exports = {
  // ...
  module: {
    // ...
    rules: [
      // ...
      {
        test: ReactNative.getAssetExtensionsRegExp(
          ReactNative.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
        ),
        use: {
          loader: '@callstack/repack/assets-loader',
          options: {
            // ...
          },
        },
      },
    ],
    // ...
  },
  // ...
};
```

and then add your own rule to process the excluded asset:

```js
// webpack.config.js
module.exports = {
  // ...
  module: {
    // ...
    rules: [
      // ...
      {
        test: ReactNative.getAssetExtensionsRegExp(
          ReactNative.ASSET_EXTENSIONS.filter((ext) => ext !== 'svg')
        ),
        // ...
      },
      {
        test: /\.svg$/, // or ReactNative.getAssetExtensionsRegExp(['svg'])
        use: {
          loader: '<your_loader>',
          options: { /* ... options for your loader ... */ }
        }
      },
    ],
    // ...
  },
  // ...
};
```

:::tip

If you want to use SVGs in your application, check out [dedicated guide on SVGs](/docs/configuration/guides/svg).

:::

## Migrating from `AssetsPlugin`

TODO

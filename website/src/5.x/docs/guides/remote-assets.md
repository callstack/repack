# Remote assets

Re.Pack provides you with a way to extract and serve your assets externally, such as on a CDN,
instead of bundling them directly into your application. When working with ModuleFederation
this is the recommended approach to handling the assets in federated modules, as inlining
the assets causes your bundle size to increase dramatically.

:::tip title="Use remote assets only in production"
During development, it's best to disable remote assets and load them locally. When you're ready to move to production, you can use `enabled: true` and then upload the assets to the CDN of your choosing.
:::

## Usage

To convert assets to remote assets you have to configure `remote` option in the [Assets loader](/api/loaders/assets-loader):

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [
      {
        test: Repack.getAssetExtensionsRegExp(),
        use: {
          loader: "@callstack/repack/assets-loader",
          options: {
            remote: {
              enabled: true,
              publicPath: "http://localhost:9999",
            },
          },
        },
      },
    ],
  },
};
```

You can also use the remote assets configuration with [getAssetsTransformRules](/api/utils/get-assets-transform-rules) helper function:

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = {
  module: {
    rules: [
      ...Repack.getAssetsTransformRules({
        remote: {
          enabled: true,
          publicPath: "http://localhost:9999",
        },
      }),
    ],
  },
};
```

Remote assets are imported in the same way as local assets:

```jsx
import image from './image.png';
<Image source={image} />
// or
<Image source={require('./image.png')} />
```

In both cases shown above, the the value of `source` prop will resolve to an object of shape:

```ts
type Source = {
  uri: string;
  width: number;
  height: number;
  scale: number;
};
```

### Default behaviour

The `uri` prop will have a value of an URL that's constructed by joining `publicPath`, 'assets' and local path to the asset together. If `publicPath` is set to https://example.com and the local path to the asset is logo.png, then the resulting `uri` value would be: `https://example.com/assets/images/logo.png`.

:::info title="Scaled assets are fully supported"

The asset will resolve to proper scale in runtime by constructing a relevant URL with scale suffix at the end of it.

:::

When you create a production bundle, a directory called `remote-assets` will be included in your project's build directory. This directory contains all of the remote assets that are needed for your application.

By default, the remote-assets directory will be located at `build/generated/<platform>/remote-assets`. However, if you want the remote assets to appear in the `OutputPlugin` directory, which is part of the `RepackPlugin`, you will need to configure an additional property called `auxiliaryAssetsPath`:

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = (env) => {
  const { platform } = env;

  return {
    plugins: [
      new Repack.RepackPlugin({
        output: {
        auxiliaryAssetsPath: path.join("build/output", platform, "remote"),
      },
    }),
  ],
};
```

The final step is to upload your remote assets to your CDN, which is located at `publicPath`, and then host them from that location, which will make them available to users of your app.

### Customizing Asset Path

The `assetPath` option offers finer control over how remote asset paths are constructed. This feature allows you to define a custom function for modifying paths, which can be helpful if you need to apply custom naming conventions or add extra directory layers.
Specified pattern will be applied to both the generated folder path and URL. If `assetPath` is not provided, the [default behaviour](#default-behaviour) will be used.

```js
{
  remote: {
    enabled: true,
    publicPath: "http://localhost:9999",
    assetPath: ({
      resourceFilename,
      resourceDirname,
      resourceExtensionType,
    }) => {
      const customHash = getCustomHash();
      return `my-remote-assets/${resourceFilename}-${customHash}.${resourceExtensionType}`;
    },
  },
}
```

The configuration above would result in the following:

- generated asset path: `<buildFolder>/remote-assets/assets/my-remote-assets/logo-customhash.png`
- generated URL: `http://localhost:9999/my-remote-assets/logo-customhash.png`

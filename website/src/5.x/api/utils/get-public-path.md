# getPublicPath

Get Rspack/webpack public path value based on the provided configuration. Returns a URL for development server or a noop URL for production builds.

## Parameters

```ts
type GetPublicPath = (options?: {
  platform: string;
  devServer?: DevServerOptions;
}) => string;
```

### options.platform

- Type: `string`
- Required: `true`

Target application platform.

### options.devServer

- Type: `DevServerOptions`
- Required: `false`

Development server configuration options.

## Example

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

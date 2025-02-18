# getResolveOptions

Get resolve options preset to properly resolve files within the project. The preset matches closely Metro's behavior.

- resolve platform extensions (e.g. `file.ios.js`)
- resolve native extensions (e.g. `file.native.js`)
- optionally use package exports (`exports` field in `package.json`) instead of main fields (e.g. `main` or `browser` or `react-native`)

## Parameters

```ts
type GetResolveOptions = (
  platform: string,
  options: {
    enablePackageExports?: boolean;
    preferNativePlatform?: boolean;
  }
) => ResolveOptions;
```

### platform

- Type: `string`
- Required: `true`

Target application platform (e.g. `ios` or `android`).

### options.enablePackageExports

- Type: `boolean`
- Default: `false`

Whether to enable Package Exports support. When enabled, uses the `exports` field in `package.json` instead of main fields.

:::warning
Package Exports support differs significantly between Metro and Re.Pack. Since this option is still marked as experimental in Metro, it's recommended to avoid using in Re.Pack for best compatbility.

For more details, please refer to the [Module Resolution guide](../guides/module-resolution).
:::

### options.preferNativePlatform

- Type: `boolean`
- Default: `true`

Whether to prefer native platform over generic platform when resolving extensions. When enabled, Re.pack will try `.native.${ext}` before `.${ext}` and after `.${platform}.${ext}` during resolution.

:::info
This matches Metro's [preferNativePlatform](https://metrobundler.dev/docs/resolution#prefernativeplatform-boolean) behavior.
:::

## Example

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

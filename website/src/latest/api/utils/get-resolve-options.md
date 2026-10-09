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
- Default: `true`

Whether to enable Package Exports support. When enabled, uses the `exports` field in `package.json` instead of main fields.

:::warning
React Native 0.87 and newer require package exports for `@react-native/asset-utils`, which only declares package exports, so don't set `enablePackageExports: false` there. React Native's own `react-native/setup-env`, `react-native/react-private-interface` and `react-native/asset-registry` entry points are aliased by Re.Pack and resolve either way.

Enabling package exports can change how existing dependencies resolve. For more details, please refer to the [Module Resolution guide](/docs/features/module-resolution).
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
        enablePackageExports: true,
        preferNativePlatform: true,
      }),
    },
  };
};
```

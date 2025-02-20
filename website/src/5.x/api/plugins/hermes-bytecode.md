# ChunksToHermesBytecode Plugin

This plugin is designed to convert JavaScript chunks into [Hermes](https://hermesengine.dev/) bytecode for production-level performance optimization.
It also converts related source maps to be compatible with bytecode bundles.

:::info
This plugin will only transform assets that are emitted after the compilation. To ensure that asset is always emitted we disable the `compareBeforeEmit` option which is enabled by default in Webpack.

`compareBeforeEmit` option is used to skip emitting assets that are identical to the
ones present in build directory, which might result in transformation being
skipped when there is a untransformed bundle present in the build directory.
:::

## Usage

```js title="webpack.config.js"
import * as Repack from '@callstack/repack';

new Repack.plugins.ChunksToHermesBytecodePlugin({
    enabled: mode === 'production' && !devServer,
    test: /\.(js)?bundle$/,
    exclude: /index.bundle$/,
}),
```

:::warning
If you enable Hermes in your project, your `index.bundle` file and it's source-map will be transformed by `react-native`.
You should exclude it from the plugin to avoid processing it twice.
:::

## Options

### enabled

- Type: `boolean`
- Required: `true`

Use this to enable or disable the plugin. You should only enable this plugin when building for production environment.

### test

- Type: `string[] | RegExp | RegExp[]`
- Required: `true`

Matches all modules that match this resource, and will match against Resource (the absolute path without query and fragment).

### include

- Type: `string[] | RegExp | RegExp[]`
- Default: `undefined`

Matches all modules that match this condition against the absolute path of the resource (without query and fragment).

### exclude

- Type: `string[] | RegExp | RegExp[]`
- Default: `undefined`

Excludes all modules that match this condition and will match against the absolute path of the resource (without query and fragment).

### hermesCLIPath

- Type: `string`
- Default: `undefined`

Path to the Hermes command-line tool. If not specified, the plugin will try to find it automatically.

### reactNativePath

- Type: `string`
- Default: `undefined`

Use this to specify the path to the React Native package. If not specified, the plugin will try to find it automatically.

### compareBeforeEmit

- Type: `boolean`
- Default: `undefined`

Use this to force enable `compareBeforeEmit` Webpack's output option.

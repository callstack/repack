# RepackPlugin

This is the main plugin that enables React Native app development & bundlingwith Re.Pack. It abstracts the configuration of other Re.Pack plugins to make the Rspack/webpack config more readable and maintainable. It provides sensible defaults while allowing customization of key features.

:::warning title="About internal plugins"

Plugins configured by the `RepackPlugin` are considered internal and there is no need to use or configure them directly. Their use is heavily discouraged and they are only included for the sake of completeness of the API.

You can learn more about internal plugins [here](/api/plugins/internal).

:::

## Usage

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = {
  plugins: [
    new Repack.RepackPlugin({
      // options
    }),
  ],
};
```

## Options

### platform

- Type: `string`
- Default: `compiler.options.name`

Target application platform. This value is used by various plugins to determine platform-specific behavior. The default value is the name of the compiler which Re.Pack sets to the target platform.

### logger

- Type: `LoggerPluginConfig['output'] | boolean`
- Default: `{}`

Options to configure the logger's output. Setting this to `false` disables the LoggerPlugin completely.

When set to `true` or left undefined, it uses default logger configuration. When an object is provided, it extends the default configuration:

```js
new Repack.RepackPlugin({
  logger: {
    console: true, // Enable console logging
    // ... other logger options
  },
});
```

### output

- Type: `OutputPluginConfig['output']`
- Default: `{}`

Output options specifying where to save generated bundle, source map and assets. These options are passed directly to the OutputPlugin.

### initializeCore

- Type: `string`
- Default: `undefined`

Absolute location to JS file with initialization logic for React Native. This is particularly useful when building for out-of-tree platforms. By default the path to `InitializeCore.js` is resolved

### extraChunks

- Type: `OutputPluginConfig['extraChunks']`
- Default: `undefined`

Options specifying how to deal with extra chunks generated in the compilation, usually by using dynamic `import(...)` function. These options are passed directly to the OutputPlugin.

## Advanced Usage

If you need more control over the configuration, you can opt out of using RepackPlugin and instead use the individual plugins directly:

```js
const Repack = require("@callstack/repack");

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(process.env.NODE_ENV === "development"),
    }),
    new Repack.plugins.BabelPlugin(),
    new Repack.plugins.OutputPlugin({
      // custom output options
    }),
    // ... other plugins as needed
  ],
};
```

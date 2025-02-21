# RepackPlugin

This is the main plugin that enables React Native app development & bundling with Re.Pack and should be included in all of your configurations. It abstracts the configuration of other core internal plugins into one plugin.

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

- Type: `Object | boolean`
- Default: `{ console: true }`

Options to configure the logger's output. Setting this to `false` disables the LoggerPlugin completely. When set to `true` or left undefined, it uses default logger configuration with console output enabled.

### logger.console

- Type: `boolean`
- Default: `true`

Enable or disable logging to the console. When enabled, build progress, warnings, errors, and other messages will be displayed in the terminal.

:::tip title="Verbose logging"

You can enable verbose logging by passing `--verbose` flag to either of CLI commands or by setting the `REPACK_VERBOSE` environment variable to `1` or `true`.

:::

### logger.file

- Type: `string`
- Default: `undefined`

Absolute path to a file where logs should be saved. If not specified, file logging will be disabled.

### logger.listener

- Type: `(log: LogEntry) => void`
- Default: `undefined`

Custom listener function that will be called for each log entry.

```ts
interface LogEntry {
  timestamp: number;
  issuer: string;
  type: "debug" | "info" | "warn" | "error" | "success";
  message: any[];
}
```

```js
new Repack.RepackPlugin({
  logger: {
    console: true,
    file: "/absolute/path/to/logs/build.log",
    listener: (log) => {
      // Custom log processing
    },
  },
});
```

### output

- Type: `Object`
- Default: `{}`

Options are passed directly to the OutputPlugin.

### output.auxiliaryAssetsPath

- Type: `string`
- Default: `undefined`

Path to a directory, where [remote assets](/docs/guides/remote-assets) should be saved.

### initializeCore

- Type: `string`
- Default: `require.resolve('react-native/Libraries/Core/InitializeCore.js')`

Absolute location to JS file with initialization logic for React Native. This is particularly useful when building for out-of-tree platforms.

### extraChunks

- Type: `DestinationSpec[]`
- Default:

```js
[
  {
    include: /.*/,
    type: "remote",
    outputPath: "<projectRoot>/build/outputs/<platform>/remotes",
  },
];
```

Options specifying how to deal with extra chunks generated in the compilation, usually by using dynamic `import()` function. Each entry in the array should conform to the `DestinationSpec` type:

```ts
interface DestinationSpec {
  test?: RegExp;
  include?: RegExp;
  exclude?: RegExp;
  type: "local" | "remote";
  outputPath?: string;
}
```

| Property     | Description                                                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test`       | Pattern to test chunk names against                                                                                                                            |
| `include`    | Pattern to include chunk names                                                                                                                                 |
| `exclude`    | Pattern to exclude chunk names                                                                                                                                 |
| `type`       | Determines where the chunk will be saved. Use `'local'` to bundle with the main application or `'remote'` for setting the chunk aside for potential CDN upload |
| `outputPath` | Absolute or relative path where chunks should be saved. Required when `type` is `'remote'`                                                                     |

The plugin uses these specifications to classify chunks into two categories:

1. **Local chunks** - Bundled with the main application bundle and included in the `.ipa`/`.apk` file
2. **Remote chunks** - Saved separately and can be downloaded on demand

By default, all chunks are treated as remote and saved under `<projectRoot>/build/outputs/<platform>/remotes` directory.

:::warning
Specifying custom value for this option will disable the default setting - you will need to configure `outputPath` for `type: 'remote'` yourself.
:::

Example configuration:

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = {
  plugins: [
    new Repack.RepackPlugin({
      extraChunks: [
        {
          // Make `my-chunk` local
          include: /my-chunk/,
          type: "local",
        },
        {
          // Make any other chunk remote
          exclude: /my-chunk/,
          type: "remote",
          outputPath,
        },
      ],
    }),
  ],
};
```

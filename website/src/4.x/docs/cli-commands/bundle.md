
# bundle

`bundle` or `webpack-bundle` is a command-line tool that builds the bundle for the provided project.

## Usage

In the root of an existing project, run this command in your terminal of choice:

```bash
react-native bundle [options]
```

## Options

### --verbose

- Type: `boolean`

Increase logging verbosity.

### --assets-dest <path>

- Type: `string`

Directory name where to store assets referenced in the bundle.

### --entry-file <path>

- Type: `string`

Path to the root JS file, either absolute or relative to JS root.

### --minify

- Type: `boolean`
- Default: `false`

Allows overriding whether bundle is minified. This defaults to false if dev is true, and true if dev is false. Disabling minification can be useful for speeding up production builds for testing purposes.

### --dev [boolean]

- Type: `boolean`
- Default: `true`

Enables development warnings and disables production optimizations.

### --bundle-output <path>

- Type: `string`

File name where to store the resulting bundle, ex. /tmp/groups.bundle.

### --sourcemap-output <path>

- Type: `string`

File name where to store the sourcemap file for resulting bundle, ex. /tmp/groups.map.

### --platform <path>

- Type: `string`
- Default: `"ios"`

Either "ios" or "android".

### --reset-cache

- Type: `boolean`
- Default: `false`

Removes cached files.

### --json <statsFile>

- Type: `string`

Stores stats in a file.

### --stats <preset>

- Type: `string`

Instructs Webpack on how to treat the stats:

- 'errors-only' - only output when errors happen
- 'errors-warnings' - only output errors and warnings happen
- 'minimal' - only output when errors or new compilation happen
- 'none' - output nothing
- 'normal' - standard output
- 'verbose' - output everything
- 'detailed' - output everything except chunkModules and chunkRootModules
- 'summary' - output webpack version, warnings count and errors count

More details: [Webpack documentation](https://webpack.js.org/configuration/stats/)

### --webpackConfig <path>

- Type: `string`
- Default: `"[project_root]/webpack.config.mjs"`

Path to a Webpack config file.

### -h, --help

Display help for the command.

# bundle

`bundle` or `webpack-bundle` is a command-line tool that builds the bundle for the provided project.

## Usage

In the root of an existing project, run this command in your terminal of choice:

```bash
react-native bundle [options]
```

## Options

### --entry-file <path>

- Type: `string`

Path to the root JS file, either absolute or relative to JS root.

### --platform <string>

- Type: `string`
- Default: `"ios"`

Either "ios" or "android".

### --dev [boolean]

- Type: `boolean`
- Default: `true`

Enables development warnings and disables production optimizations.

### --minify [boolean]

- Type: `boolean`

Allows overriding whether bundle is minified. This defaults to false if dev is true, and true if dev is false. Disabling minification can be useful for speeding up production builds for testing purposes.

### --bundle-output <string>

- Type: `string`

File name where to store the resulting bundle, ex. /tmp/groups.bundle.

### --sourcemap-output <string>

- Type: `string`

File name where to store the sourcemap file for resulting bundle, ex. /tmp/groups.map.

### --assets-dest <string>

- Type: `string`

Directory name where to store assets referenced in the bundle.

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

### --verbose

- Type: `boolean`

Enables verbose logging.

### --webpackConfig <path>

- Type: `string`

Path to a Webpack config file.

### -h, --help

Display help for the command.

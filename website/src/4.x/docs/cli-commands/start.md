
# start

`start` or `webpack-start` is a command-line tool that starts the React Native development server with Webpack integration.

## Usage

In the root of an existing React Native project with re.pack, run this command in your terminal of choice:

```bash
react-native start [options]
```

## Options

### --verbose

- Type: `boolean`
- Default: `false`

Increase logging verbosity.

### --cert <path>

- Type: `string`

Path to custom SSL certificate.

### --host <string>

- Type: `string`
- Default: `""`

Set the server host.

### --https

- Type: `boolean`
- Default: `false`

Enables HTTPS connections to the server.

### --key <path>

- Type: `string`

Path to custom SSL key.

### --port <number>

- Type: `number`

The port number that runs the server on.

### --no-interactive

- Type: `boolean`

Disables interactive mode.

### --silent

- Type: `boolean`
- Default: `false`

Silences all logs to the console/stdout.

### --experimental-debugger

- Type: `boolean`
- Default: `false`

Enable the new debugger experience. Connection reliability and some basic features are unstable in this release.

### --json

- Type: `boolean`
- Default: `false`

Log all messages to the console/stdout in JSON format.

### --reverse-port

- Type: `boolean`
- Default: `false`

ADB reverse port on starting devServers only for Android.

### --log-file <path>

- Type: `string`

Enables file logging to specified file.

### --webpackConfig <path>

- Type: `string`
- Default: `"[project_root]/webpack.config.mjs"`

Path to a Webpack config file.

### -h, --help

Display help for the command.

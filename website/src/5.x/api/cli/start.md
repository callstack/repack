# start

`start` or `webpack-start` is a command-line tool that starts the React Native development server with Webpack integration.

## Usage

In the root of an existing React Native project with re.pack, run this command in your terminal of choice:

```bash
react-native start [options]
```

:::info

To stay compatible with the `@react-native-community/cli` command, the following flags are included but are not functional:

- `--reset-cache`
- `--resetCache`

:::

## Options

### --port <number>

- Type: `number`

The port number that runs the server on.

### --host <string>

- Type: `string`
- Default: `""`

Set the server host.

### --https

- Type: `boolean`

Enables HTTPS connections to the server.

### --key <path>

- Type: `string`

Path to custom SSL key.

### --cert <path>

- Type: `string`

Path to custom SSL certificate.

### --no-interactive

- Type: `boolean`

Disables interactive mode.

### --experimental-debugger

- Type: `boolean`

Enable the new debugger experience. Connection reliability and some basic features are unstable in this release.

### --json

- Type: `boolean`

Log all messages to the console/stdout in JSON format.

### --log-file <path>

- Type: `string`

Enables file logging to specified file.

### --reverse-port

- Type: `boolean`

ADB reverse port on starting devServers only for Android.

### --silent

- Type: `boolean`

Silences all logs to the console/stdout.

### --verbose

- Type: `boolean`

Enables verbose logging.

### --webpackConfig <path>

- Type: `string`

Path to a Webpack config file.

### -h, --help

Display help for the command.

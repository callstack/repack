# repack-init

`@callstack/repack-init` is a command-line tool that helps you to set up Re.Pack in your React Native project. It installs all required dependencies and configures your project to use Re.Pack.

## Usage

```bash
npx @callstack/repack-init [options]
```

## Options

### `-c`, `-custom-version`

- Type: `string`
- Default: `latest`

Use a custom version of Re.Pack.

### `-e`, `--entry`

- Type: `string`
- Default: `index.js`

Path to the entry file of your `react-native` application.

### `-f`, `--format`

- Type: `mjs` | `cjs`
- Default: `mjs`

Format of the Webpack config file. Available choices `"mjs"`, `"cjs"`.

### `-v, --verbose`

- Type: `boolean`
- Default: `false`

Enable verbose output.

### `--version`

Show version number.

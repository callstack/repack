## About

`@callstack/repack-init` is a command-line tool that helps you to set up Re.Pack in your React Native project. It installs all required dependencies and configures your project to use Re.Pack.

## Usage

```bash
npx @callstack/repack-init [options]
```

## Options

- `-c, --custom-version` Use a custom version of Re.Pack. By default, the latest version is used.
- `-e, --entry` Path to the entry file of your `react-native` application. By default, it is set to `index.js`.
- `-f, --format` Format of the Webpack config file. Available choices `"mjs"`, `"cjs"`. By default, it is set to `"mjs"`.
- `-v, --verbose` Enable verbose output. Default is `false`.
- `--version` Show version number.

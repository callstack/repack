# Initialize Re.Pack in your project

`@callstack/repack-init` is a command-line tool that initializes Re.Pack setup in React Native projects.

The tool detects whether it's being run in an existing React Native project. If not, it will create a new React Native app with Re.Pack pre-configured. If run inside an existing project, it will install all necessary dependencies and configure your project to use Re.Pack.

## Usage

```bash
npx @callstack/repack-init
```

![repack-init](/img/init.png)

## Options

### `--bundler`, `-b`

- Type: `rspack` | `webpack`
- Required: `true`

Specify the bundler to use.

### `--custom-version`, `-c`

- Type: `string`
- Default: `latest`

Specify the version of `@callstack/repack` to install.

### `--entry`, `-e`

- Type: `string`
- Default: `index.js`

Path to the main entry point of the React-Native project.

### `--format`, `-f`

- Type: `mjs` | `cjs`
- Default: `mjs`

Format of the config file.

### `--verbose`, `-v`

- Type: `boolean`
- Default: `false`

Enable verbose logging.

### `--version`

Show version number.

### `--help`

Show help information.

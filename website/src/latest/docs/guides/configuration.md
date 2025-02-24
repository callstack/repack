# Configuration

Re.Pack uses the same configuration system as Rspack and webpack. This means you can leverage the extensive configuration options from either of the bundlers while working with React Native projects. Re.Pack comes with minimal, development & production-ready defaults that work out of the box, but as your project grows, you may need to customize various aspects of the bundling process.

## How to configure

Since Re.Pack is built on top of Rspack and webpack, you can refer to their respective documentation for available configuration options:

- [Rspack documentation](https://rspack.dev/config.html)
- [webpack documentation](https://webpack.js.org/configuration/)

For example, if you want to configure output options for your bundles, you would look up these options in the [Rspack output documentation](https://rspack.dev/config/output.html) or [webpack output documentation](https://webpack.js.org/configuration/output/) and use them in the project config:

```js title="rspack.config.cjs"
module.exports = {
  output: {
    filename: "index.bundle",
    chunkFilename: "[name].chunk.bundle",
  },
};
```

You can find all available options in the respective bundler's documentation. Most configuration options work the same way as they do in Rspack/webpack, with some React Native specific extensions that we'll cover later in this guide.

## Configuration variants

Configuration can be defined in two ways: as a static object or as a function that returns a configuration object.

### Static configuration

The simplest form is a static object that defines your configuration:

```js title="rspack.config.cjs"
const Repack = require("repack");

module.exports = {
  entry: "./index.js",
  output: {
    filename: "index.bundle",
  },
  plugins: [new Repack.RepackPlugin()],
};
```

### Dynamic configuration

For more flexibility, you can export a function that returns the configuration object. This is useful when you need to:

- Configure an option based on the platform (e.g. `ios` or `android`)
- Enable or disable configuration based on the `mode`

```js title="rspack.config.cjs"
const Repack = require("repack");

module.exports = function (env) {
  const { mode, platform } = env;

  return {
    mode,
    output: {
      path: path.resolve(__dirname, "build/generated", platform),
    },
    plugins: [new Repack.RepackPlugin()],
  };
};
```

The `env` argument is an object with the following properties:

| Property            | Type                    | Description                                                                     |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| `mode`              | `string`                | Compilation mode (`'production'` or `'development'`)                            |
| `platform`          | `string`                | Target application platform                                                     |
| `context`           | `string`                | Context in which all resolution happens (usually project root directory)        |
| `entry`             | `string`                | Input filename - entry point of the bundle                                      |
| `bundleFilename`    | `string`                | Bundle output filename - name under which generated bundle will be saved        |
| `sourceMapFilename` | `string`                | Source map filename for the main bundle                                         |
| `assetsPath`        | `string`                | Directory where generated static assets will be saved                           |
| `minimize`          | `boolean`               | Whether to minimize the final bundle                                            |
| `reactNativePath`   | `string`                | Path to React Native dependency (usually points to `node_modules/react-native`) |
| `devServer`         | `object` \| `undefined` | Development server configuration options                                        |

## Configuration precedence

Re.Pack follows a specific order when resolving configuration values. When the same option is defined in multiple places, the value with higher precedence takes priority. Here's the precedence order from highest to lowest:

1. CLI flags (e.g. `--mode production`)
2. Project configuration (your `rspack.config.js` or `webpack.config.js`)
3. Command-specific configuration
4. Re.Pack defaults
5. Rspack/webpack defaults

For example, if you set the `mode` in your configuration file:

```js title="rspack.config.cjs"
module.exports = {
  mode: "development",
};
```

But run the CLI with a different mode:

```bash
react-native bundle --mode production
```

The CLI flag (`production`) will take precedence over the configuration file value (`development`).

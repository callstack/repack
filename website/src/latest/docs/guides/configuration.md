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

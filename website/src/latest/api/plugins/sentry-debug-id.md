# SentryDebugId Plugin

This plugin stamps a [Sentry](https://sentry.io) Debug ID into the bundle and its source map.

A Debug ID is a UUID present in both artifacts. The Sentry SDK reports it with every event, and Sentry uses it to pair a JS stack trace with the source map that resolves it. Without it, symbolication falls back to matching on `release` and `dist`, which only works when the values used at upload time match the ones the SDK reports at runtime.

For Metro, `@sentry/react-native` provides this through `createSentryMetroSerializer`. This plugin is the Re.Pack counterpart.

:::info Why `@sentry/webpack-plugin` is not enough
`@sentry/webpack-plugin` injects Debug IDs through a `BannerPlugin` whose `include` only matches `.js`-like filenames, so it skips React Native bundle names such as `index.bundle`. It also writes the Debug ID only into the source map copy it uploads, never into the emitted asset, which is what `@sentry/react-native`'s Gradle and Xcode upload scripts read.

You can use both plugins together: this one handles the Debug ID, `@sentry/webpack-plugin` handles release creation and upload.
:::

## Usage

```js title="rspack.config.cjs"
const Repack = require("@callstack/repack");

module.exports = {
  plugins: [
    new Repack.SentryDebugIdPlugin({
      // options
    }),
  ],
};
```

Debug IDs are only useful for release builds, so you will usually add the plugin for production compilations only.

## Options

### test

- Type: `RegExp`
- Required: `false`
- Default: `/\.([cm]?jsx?|bundle)$/`

Matches the bundles that should receive a Debug ID.

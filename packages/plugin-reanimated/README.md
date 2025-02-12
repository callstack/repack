<div align="center">
  <img src="https://raw.githubusercontent.com/callstack/repack/HEAD/logo.png" width="650" alt="Re.Pack logo" />
  <h3>A toolkit to build your React Native application with Rspack or Webpack.</h3>
</div>
<div align="center">

[![mit licence][license-badge]][license]
[![npm downloads][npm-downloads-badge]][npm-downloads]
[![Chat][chat-badge]][chat]
[![PRs Welcome][prs-welcome-badge]][prs-welcome]

</div>

`@callstack/repack-plugin-reanimated` is a plugin for [`@callstack/repack`](https://github.com/callstack/repack) that integrates `react-native-reanimated` into your React Native projects.

## About

This plugin exists in order to simplify the setup required to get `react-native-reanimated` working with Re.Pack and to minimize the impact on build performance. It looks for relevant keywords like `worklet` inside the source before transforming the file with `babel`.

## Installation

```sh
npm install -D @callstack/repack-plugin-reanimated
```

## Usage

### Plugin

To add the plugin to your Re.Pack configuration, update your `rspack.config.js` or `webpack.config.js` as follows:

```js
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';

export default (env) => {
  // ...
  return {
    // ...
    plugins: [
      // ...
      new ReanimatedPlugin(),
    ],
  };
};
```

### Loader

The plugin also comes with it's own loader, which you can use on it's own inside `rspack.config.js` or `webpack.config.js` like this:

```js
export default (env) => {
  // ...
  return {
    // ...
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: '@callstack/repack-plugin-reanimated/loader',
            options: {
              babelPlugins: [
                [
                  '@babel/plugin-syntax-typescript',
                  { isTSX: false, allowNamespaces: true },
                ],
              ],
            },
          },
        },
      ],
    },
  };
};
```

---

Check out our website at https://re-pack.dev for more info and documentation or our GitHub: https://github.com/callstack/repack.

<!-- badges -->

[license-badge]: https://img.shields.io/npm/l/@callstack/repack?style=for-the-badge
[license]: https://github.com/callstack/repack/blob/main/LICENSE
[npm-downloads-badge]: https://img.shields.io/npm/dm/@callstack/repack?style=for-the-badge
[npm-downloads]: https://www.npmjs.com/package/@callstack/repack
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[prs-welcome]: ./CONTRIBUTING.md
[chat-badge]: https://img.shields.io/discord/426714625279524876.svg?style=for-the-badge
[chat]: https://discord.gg/Q4yr2rTWYF

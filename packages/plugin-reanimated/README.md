<a href="https://www.callstack.com/open-source?utm_campaign=generic&utm_source=github&utm_medium=referral&utm_content=repack" align="center">
  <img src="https://github.com/user-attachments/assets/de25944e-d91e-4a2c-bec9-8b0595bd1bbb" alt="Re.Pack" />
</a>
<h3 align="center">A toolkit to build your React Native application with Rspack or Webpack.</h3>
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

## Made with ❤️ at Callstack

`@callstack/repack` is an open source project and will always remain free to use. If you think it's cool, please star it 🌟. [Callstack][callstack-readme-with-love] is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

Like the project? ⚛️ [Join the team](https://callstack.com/careers/?utm_campaign=Senior_RN&utm_source=github&utm_medium=readme) who does amazing stuff for clients and drives React Native Open Source! 🔥

<!-- badges -->

[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=repack&utm_term=readme-with-love
[license-badge]: https://img.shields.io/npm/l/@callstack/repack?style=for-the-badge
[license]: https://github.com/callstack/repack/blob/main/LICENSE
[npm-downloads-badge]: https://img.shields.io/npm/dm/@callstack/repack?style=for-the-badge
[npm-downloads]: https://www.npmjs.com/package/@callstack/repack
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[prs-welcome]: ./CONTRIBUTING.md
[chat-badge]: https://img.shields.io/discord/426714625279524876.svg?style=for-the-badge
[chat]: https://discord.gg/Q4yr2rTWYF

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

`@callstack/repack-plugin-expo-modules` is a plugin for [`@callstack/repack`](https://github.com/callstack/repack) that compliments the integration of Expo Modules into your React Native projects.

## About

This plugin helps and compliments the process of enabling Expo Modules in Re.Pack projects by defining necessary globals that are expected by Expo Modules at runtime. However, it is not sufficient on its own for a complete setup. For comprehensive guidance on using Expo Modules with Re.Pack, please refer to our [official documentation](https://re-pack.dev/).

## Installation

```sh
npm install -D @callstack/repack-plugin-expo-modules
```

## Usage

### Plugin

To add the plugin to your Re.Pack configuration, update your `rspack.config.js` or `webpack.config.js` as follows:

```js
import { ExpoModulesPlugin } from "@callstack/repack-plugin-expo-modules";

export default (env) => {
  // ...
  return {
    // ...
    plugins: [
      // ...
      new ExpoModulesPlugin(),
    ],
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

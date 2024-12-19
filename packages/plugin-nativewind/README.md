<p align="center">
    <img src="https://raw.githubusercontent.com/callstack/repack/HEAD/logo.png">
</p>
<p align="center">
A toolkit to build your React Native application with Rspack or Webpack.
</p>

---

[![Build Status][build-badge]][build]
[![Version][version-badge]][version]
[![MIT License][license-badge]][license]
[![PRs Welcome][prs-welcome-badge]][prs-welcome]
[![Code of Conduct][coc-badge]][coc]

`@callstack/repack-plugin-nativewind` is a plugin for `@callstack/repack` that integrates [NativeWind](https://github.com/nativewind/nativewind) into your React Native projects.

## About

Use NativeWind in Re.Pack projects.

## Installation

```sh
npm install -D @callstack/repack-plugin-nativewind
```

```sh
npm install nativewind react-native-css-interop
```

## Usage

### Plugin

To add the plugin to your Re.Pack configuration follow this guide: https://www.nativewind.dev/getting-started/react-native

- Follow step 1, 2, and 5 (and optionally 7)
- At step 3 and 4, instead of editing `babel.config.js` (which is not used) or changing Metro config (again, not used) update your `rspack.config.js` or `webpack.config.js` as follows:

```js
import { NativeWindPlugin } from "@callstack/repack-plugin-nativewind";

export default (env) => {
  // ...
  return {
    // ...
    plugins: [
      // ...
      new NativeWindPlugin({
        input: "./global.css",
      }),
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
            loader: "@callstack/repack-plugin-nativewind/loader",
            options: {
              babelPlugins: [
                [
                  "@babel/plugin-syntax-typescript",
                  { isTSX: false, allowNamespaces: true },
                ],
                "nativewind/babel",
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

[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=react-native-paper&utm_term=readme-with-love
[build-badge]: https://img.shields.io/github/workflow/status/callstack/repack/CI/main?style=flat-square
[build]: https://github.com/callstack/repack/actions/workflows/main.yml
[version-badge]: https://img.shields.io/npm/v/@callstack/repack-plugin-nativewind?style=flat-square
[version]: https://www.npmjs.com/package/@callstack/repack-plugin-nativewind
[license-badge]: https://img.shields.io/npm/l/@callstack/repack-plugin-nativewind?style=flat-square
[license]: https://github.com/callstack/repack/blob/master/LICENSE
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs-welcome]: ./CONTRIBUTING.md
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/callstack/repack/blob/master/CODE_OF_CONDUCT.md

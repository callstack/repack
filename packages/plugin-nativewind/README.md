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

`@callstack/repack-plugin-nativewind` is a plugin for `@callstack/repack` that enables integrating [NativeWind](https://github.com/nativewind/nativewind) into your React Native projects.

## About

This plugin seamlessly integrates NativeWind with Re.Pack's build process by:

- Configuring PostCSS and Tailwind CSS processing for your stylesheets
- Handling conversion of CSS to React Native-compatible styles
- Setting up proper SWC transformations for NativeWind's JSX runtime

## Installation

First, follow these steps from the official [NativeWind installation guide](https://www.nativewind.dev/getting-started/react-native):

1. [Install NativeWind](https://www.nativewind.dev/getting-started/react-native#installation)
2. [Setup Tailwind CSS](https://www.nativewind.dev/getting-started/react-native#2-setup-tailwind-css)
3. [Import your CSS file](https://www.nativewind.dev/getting-started/react-native#5-import-your-css-file)
4. (Optional) [Setup TypeScript support](https://www.nativewind.dev/getting-started/typescript)

Then install the Re.Pack NativeWind plugin:

```sh
npm install -D @callstack/repack-plugin-nativewind
```

## Usage

> **Note**: If you are using Webpack (not Rspack), you need to add the following configuration to your `babel.config.js`:
>
> ```js
> plugins: [
>   [
>     '@babel/plugin-transform-react-jsx',
>     {
>       runtime: 'automatic',
>       importSource: 'nativewind',
>     },
>   ],
> ],
> ```

### Plugin

To add the plugin to your Re.Pack configuration, update your `rspack.config.js` or `webpack.config.js` as follows:

```js
import { NativeWindPlugin } from "@callstack/repack-plugin-nativewind";

export default (env) => {
  // ...
  return {
    // ...
    plugins: [
      // ...
      new NativeWindPlugin(),
    ],
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

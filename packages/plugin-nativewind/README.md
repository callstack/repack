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

`@callstack/repack-plugin-nativewind` is a plugin for [`@callstack/repack`](https://github.com/callstack/repack) that enables integrating [NativeWind](https://github.com/nativewind/nativewind) into your React Native projects.

## About

This plugin seamlessly integrates NativeWind with Re.Pack's build process by:

- Configuring PostCSS and Tailwind CSS processing for your stylesheets
- Handling conversion of CSS to React Native-compatible styles
- Setting up proper SWC transformations for NativeWind's JSX runtime

## Installation

First, follow these steps from the official [NativeWind installation guide](https://www.nativewind.dev/docs/getting-started/installation):

1. [Install NativeWind](https://www.nativewind.dev/docs/getting-started/installation#1-install-nativewind)
2. [Setup Tailwind CSS](https://www.nativewind.dev/docs/getting-started/installation#2-setup-tailwind-css)
3. [Import your CSS file](https://www.nativewind.dev/docs/getting-started/installation#5-import-your-css-file)
4. (Optional) [Setup TypeScript support](https://www.nativewind.dev/docs/getting-started/installation#7-typescript-setup-optional)

Then install the Re.Pack NativeWind plugin and it's dependencies:

```sh
npm install -D @callstack/repack-plugin-nativewind postcss postcss-loader autoprefixer
```

These additional dependencies (`postcss`, `postcss-loader`, and `autoprefixer`) are required for processing Tailwind CSS with Webpack/Rspack, as specified in the [official Tailwind CSS Rspack guide](https://tailwindcss.com/docs/guides/rspack). They enable PostCSS processing and autoprefixing of CSS styles in your build pipeline.

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

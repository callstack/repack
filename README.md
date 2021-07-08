<p align="center">
  <img src="./logo.png">
</p>
<p align="center">
A Webpack-based toolkit to build your React Native application with full support of Webpack ecosystem.
</p>

---

[![Go to: Installation][goto-installation-badge]][goto-installation]
[![Go to: Usage][goto-usage-badge]][goto-usage]
[![Go to: Usage][goto-api-docs-badge]][goto-api-docs]

[![Go to: Usage][goto-contributing-badge]][goto-contributing]
[![Go to: Usage][goto-architecture-badge]][goto-architecture]

[![Build Status][build-badge]][build]
[![Version][version-badge]][version]
[![MIT License][license-badge]][license]
[![PRs Welcome][prs-welcome-badge]][prs-welcome]
[![Code of Conduct][coc-badge]][coc]

Re.pack is a next generation of [Haul](https://github.com/callstack/haul) — a Webpack-based bundler for React Native applications.

Re.pack uses Webpack 5 and React Native CLI's plugin system to allow you to bundle your application using Webpack and allow to easily switch from Metro.

__Check the base [`webpack.config.js`](https://github.com/callstack/repack/blob/main/templates/webpack.config.js) template, if you're curious how it all looks like.__

## Features

- [x] Webpack ecosystem, plugins and utilities
- [x] Build production bundle for iOS, Android and out-of-tree platforms
- [x] Build development bundle for iOS, Android and out-of-tree platforms
- [x] Development server with support for:
  - Remote JS debugging
  - Source Map symbolication 
  - Hot Module Replacement and React Refresh
  - Reloading application from CLI using `r` key
- [x] Built-in Hot Module Replacement + React Refresh support
- [x] Flipper support:
  - Crash Reporter,
  - Application logs
  - Layout
  - Network
  - Hermes debugger
  - React DevTools
  - Development server (debugging/verbose) logs
- [x] Hermes support:
  - Running the production/development bundle using Harmes engine
  - Transforming production bundle into bytecode bundle
  - Inspecting running Hermes engine with Flipper
- [x] [Code splitting](https://github.com/callstack/nativepack/discussions/45) (__experimental__):
  - Dynamic `import()` support with and without `React.lazy()` (recommended).
  - Manual chunks using [`entry` option](https://webpack.js.org/concepts/entry-points/) (only for advanced users).

### Planned features

- [ ] `ChunksToHermesBytecodePlugin` plugin to automatically transform async chunks to bytecode format.
- [ ] `webpack-init` command
- [ ] Web dashboard / Flipper plugin with:
  - Logs
  - Compilations progress, errors and emitted assets
  - Bundle visualizations
- [ ] [Module Federation](https://medium.com/swlh/webpack-5-module-federation-a-game-changer-to-javascript-architecture-bcdd30e02669) support

## Why & when

The main feature of Re.pack is Webpack and its ecosystem of loaders, plugins and support for various features like symlinks, aliases etc. However, because Re.pack is based on Webpack, it is targeted towards advanced users who already know how to use Webpack and want to leverage Webpack ecosystem.

If you're just starting with React Native, it's better to stick with the default solution — Metro, since you probably won't benefit much from switching to Webpack.

You can read more about design goals and comparisons here: [About Re.pack](https://github.com/callstack/nativepack/discussions/43)

## Installation & setup

### Compatibility with Webpack

On paper, Re.pack should work with any version of Webpack 5, but we recommend to consult with the compatibility table below.
The table represents versions of `webpack` for which Re.pack is confirmed to work correctly.

If you don't see your version, give it a go. If it doesn't work, please open an issue.


| `webpack`  | `@callstack/repack`     | `@callstack/nativepack`*  |
| ---------- | ----------------------- | ------------------------- |
| `5.22.0`   |                         | `1.0.x`, `1.1.x`, `1.2.x` |
| `>=5.29.0` | `2.0.0-beta.x`          | `1.2.x`, `1.3.x`, `1.4.x` |

> \* `@callstack/repack` is rebranded `@callstack/nativepack` - they are both the same project.

1. Install necessary dependencies:

```bash
npm i -D webpack terser-webpack-plugin babel-loader @callstack/repack
# or
yarn add -D webpack terser-webpack-plugin babel-loader @callstack/repack
```
2. Create `react-native.config.js` (if it doesn't exists) and paste the following content:
    ```js
    module.exports = {
      commands: require('@callstack/repack/commands')
    };
    ```
3. Create `webpack.config.js` based on the [template](https://github.com/callstack/repack/blob/main/templates/webpack.config.js).
4. Configure XCode/Gradle to use `webpack-bundle`/`webpack-start` commands:
   - XCode: Add `export BUNDLE_COMMAND=webpack-bundle` to **_Bundle React Native code and images_** phase inside **_Build Phases_** in your project XCode config. The final phase should look similar to:
     ```bash
     export NODE_BINARY=node
     export BUNDLE_COMMAND=webpack-bundle
     ../node_modules/react-native/scripts/react-native-xcode.sh
     ```
   - Gradle: Add `bundleCommand: "webpack-bundle"` setting to `project.ext.react` inside `android/app/build.gradle` file, so it looks similar to:
     ```groovy
     project.ext.react = [
         enableHermes: false,  // clean and rebuild if changing
         bundleCommand: "webpack-bundle",
         bundleInDebug: false
     ]
     ```
5. Now you can build your app for production or run development server with `npx react-native webpack-start` and develop your app.

## Usage

Once you've completed [Installation & setup](#installation--setup) you can:

- Build your application for production using XCode/Android Studio/Gradle/Fastlane or whichever tool you use.
- Develop your application by starting development server with `npx react-native webpack-start`.
- Create JavaScript bundle only by running `npx react-native webpack-bundle`.
- Create JavaScript bundle or start development server with Webpack CLI by running `npx webpack-cli -c webpack.config.js`.

## Documentation

- [API documentation](https://re-pack.netlify.app/)
- [Known issues & limitations](https://github.com/callstack/nativepack/discussions/44)
- [Code splitting](https://github.com/callstack/nativepack/discussions/45)

## Made with ❤️ at Callstack

`@callstack/repack` is an open source project and will always remain free to use. If you think it's cool, please star it 🌟. [Callstack][callstack-readme-with-love] is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

Like the project? ⚛️ [Join the team](https://callstack.com/careers/?utm_campaign=Senior_RN&utm_source=github&utm_medium=readme) who does amazing stuff for clients and drives React Native Open Source! 🔥

<!-- badges -->
[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=react-native-paper&utm_term=readme-with-love
[goto-installation-badge]: https://img.shields.io/badge/go%20to-Installation-blue?style=flat-square
[goto-installation]: #installation--setup
[goto-usage-badge]: https://img.shields.io/badge/go%20to-Usage-blue?style=flat-square
[goto-usage]: #usage
[goto-api-docs-badge]: https://img.shields.io/badge/go%20to-API%20docs-blue?style=flat-square
[goto-api-docs]: https://re-pack.netlify.app/

[goto-contributing-badge]: https://img.shields.io/badge/go%20to-CONTRIBUTING.md-blue?style=flat-square
[goto-contributing]: ./CONTRIBUTING.md
[goto-architecture-badge]: https://img.shields.io/badge/go%20to-ARCHITECTURE.md-blue?style=flat-square
[goto-architecture]: ./ARCHITECTURE.md

[build-badge]: https://img.shields.io/github/workflow/status/callstack/repack/CI/main?style=flat-square
[build]: https://github.com/callstack/repack/actions/workflows/main.yml
[version-badge]: https://img.shields.io/npm/v/@callstack/repack?style=flat-square
[version]: https://www.npmjs.com/package/@callstack/repack
[license-badge]: https://img.shields.io/npm/l/@callstack/repack?style=flat-square
[license]: https://github.com/callstack/repack/blob/master/LICENSE
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs-welcome]: ./CONTRIBUTING.md
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/callstack/repack/blob/master/CODE_OF_CONDUCT.md

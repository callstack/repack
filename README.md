<h1 align="center">cargo-toolkit</h1>
<p align="center">
A Webpack-based toolkit to build your React Native application with full support of Webpack ecosystem.
</p>

---

[![Go to: Installation][goto-installation-badge]][goto-installation]
[![Go to: Usage][goto-usage-badge]][goto-usage]
[![Go to: Usage][goto-api-docs-badge]][goto-api-docs]


[![Build Status][build-badge]][build]
[![MIT License][license-badge]][license]
[![PRs Welcome][prs-welcome-badge]][prs-welcome]
[![Code of Conduct][coc-badge]][coc]

`cargo-toolkit` is a next generation of [Haul](https://github.com/callstack/haul) - a Webpack-based bundler for React Native applications.

`cargo-toolkit` uses Webpack 5 and React Native CLI's plugin system to allow you to bundle your application using Webpack and allow to easily switch from Metro.

## Features

- [x] Webpack ecosystem, plugins and utilities
- [x] Build production bundle for iOS, Android and out-of-tree platforms
- [x] Build development bundle for iOS, Android and out-of-tree platforms
- [x] Development server with Remote JS Debugging, Source Map symbolication and HMR support
- [x] Hot Module Replacement + React Refresh support
- [x] Reloading application from CLI

### Planned features

- [ ] Flipper support
- [ ] `cargo-init` command
- [ ] Web dashboard with logs, compilation statues, bundle explorer, visualizations and more
- [ ] Asynchronous chunks
- [ ] Tighter integration with React Native CLI
- [ ] [Module Federation](https://medium.com/swlh/webpack-5-module-federation-a-game-changer-to-javascript-architecture-bcdd30e02669) support

## Why & when

The main feature of `cargo-toolkit` is Webpack and it's ecosystem of loaders, plugins and support for various features like symlinks, aliases etc. However, because `cargo-toolkit` is based on Webpack, it is targeted towards advanced users who already know how to use Webpack and want to leverage Webpack ecosystem.

If you're just starting with React Native, it's better to stick with the default solution - Metro, since you probably won't benefit much from switching to Webpack.

## Design goals

1. `cargo-toolkit` was design for the advanced users, as such it exposes _low-level API_ in form of Webpack plugins and utilities, meaning we only give you the tools you need to build React Native application, but the actual configuration and maintenance of said config is on your shoulders.
2. In order to support wide variety of use cases and give you as much control as possible, `cargo-toolkit` is written to allow you to bundle and run development server directly from Webpack CLI as well by using React Native CLI. You can decide which one you want to go with.
3. Based on our experience with [Haul](https://github.com/callstack/haul), we shift as much responsibility onto you as possible, so that we can develop features, move at reasonable pace and reduce maintenance cost. Therefor, `cargo-toolkit` should be used by seasoned React Native developers with at least basic experience with Webpack.
4. __[Future]__ We plan to use `cargo-toolkit` as a foundation for bringing multi-bundle support to React Native, by allowing you to use asynchronous chunks and finally Webpack 5 latest feature - [Module Federation](https://medium.com/swlh/webpack-5-module-federation-a-game-changer-to-javascript-architecture-bcdd30e02669).


## `cargo-toolkit` vs Metro

Both Metro and `cargo-toolkit` have different approaches for the similar problem - bundling JavaScript code for your React Native application, where Metro is custom-built solution and `cargo-toolkit` uses Webpack. As a result there few differences that you should consider when deciding which one to use:

- Metro is slightly faster, since it has less overhead compared to Webpack and it's configuration options, plugin and loader system.
- Webpack configuration options and ecosystem allows for much greater control and support for advanced use-cases.
- Metro's Fast Refresh is slightly more flexible compared to Webpack's solution: Hot Module Replacement + React Refresh - some cases require full application reloaded with `cargo-toolkit`, but they are supported with Metro.

## `cargo-toolkit` vs Haul

`cargo-toolkit` is a direct successor to [Haul](https://github.com/callstack/haul). Therefore we took the experience we gained with Haul while making rather major changes in the approach:

- `cargo-toolkit` has smaller footprint and allows for greater level of customization, since you have access to the Webpack config.
- `cargo-toolkit` supports Hot Module Replacement + React Refresh, whereas Haul does not.
- `cargo-toolkit` doesn't support any kind of multi-bundling __yet__, whereas Haul supports legacy implementation of multi-bundling (though it requires to alter React Native source code, so we don't recommend that).
- `cargo-toolkit` delivers better Developer Experience by providing you with more meaningful logs, easier usage and more customizability.

## Installation & setup

1. Install `cargo-toolkit` dependency:

```bash
npm i -D cargo-toolkit
# or
yarn add -D cargo-toolkit
```

2. Create `webpack.config.js` based on the [template](./templates/webpack.config.js).
3. Configure XCode/Gradle to use `cargo-bundle`/`cargo-start` commands:
   - XCode: Add `export BUNDLE_COMMAND=cargo-bundle` to **_Bundle React Native code and images_** phase inside **_Build Phases_** in your project XCode config. The final phase should look similar to:
     ```bash
     export NODE_BINARY=node
     export BUNDLE_COMMAND=webpack-bundle
     ../node_modules/react-native/scripts/react-native-xcode.sh
     ```
   - Gradle: Add `bundleCommand: "cargo-bundle"` setting to `project.ext.react` inside `android/app/build.gradle` file, so it looks similar to:
     ```groovy
     project.ext.react = [
         enableHermes: false,  // clean and rebuild if changing
         bundleCommand: "cargo-bundle",
         bundleInDebug: false
     ]
     ```
4. Now you can build your app for production or run development server with `npx react-native cargo-start` and develop your app.

## Usage

Once you've completed [Installation & setup](#installation--setup) you can:

- Build your application for production using XCode/Android Studio/Gradle/Fastlane or whichever tool you use.
- Develop your application by starting development server with `npx react-native cargo-start`.
- Building JavaScript bundle only by running `npx react-native cargo-bundle`.
- Building JavaScript bundle or starting development server with Webpack CLI by running `npx webpack-cli -c webpack.config.js`.

## API documentation

The API documentation is available at https://callstack.github.io/cargo-bundler/

## Made with ❤️ at Callstack

Haul is an open source project and will always remain free to use. If you think it's cool, please star it 🌟. [Callstack][callstack-readme-with-love] is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

<!-- badges -->
[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=react-native-paper&utm_term=readme-with-love
[goto-installation-badge]: https://img.shields.io/badge/go%20to-Installation-blue?style=flat-square
[goto-installation]: #installation--setup
[goto-usage-badge]: https://img.shields.io/badge/go%20to-Usage-blue?style=flat-square
[goto-usage]: #usage
[goto-api-docs-badge]: https://img.shields.io/badge/go%20to-API%20docs-blue?style=flat-square
[goto-api-docs]: https://callstack.github.io/cargo-bundler/

[build-badge]: https://img.shields.io/github/checks-status/callstack/cargo-toolkit/main?label=build&style=flat-square
[build]: https://circleci.com/gh/callstack/cargo-toolkit
[license-badge]: https://img.shields.io/npm/l/cargo-toolkit.svg?style=flat-square
[license]: https://github.com/callstack/cargo-toolkit/blob/master/LICENSE
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs-welcome]: http://makeapullrequest.com
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/callstack/cargo-toolkit/blob/master/CODE_OF_CONDUCT.md
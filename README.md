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

Re.Pack is a next generation of [Haul](https://github.com/callstack/haul) — a Webpack-based bundler for React Native applications.

Re.Pack uses Webpack 5 and React Native CLI's plugin system to allow you to bundle your application using Webpack and allow to easily switch from Metro.

__Check the base [`webpack.config.cjs`](https://github.com/callstack/repack/blob/main/templates/webpack.config.cjs) or [`webpack.config.mjs`](https://github.com/callstack/repack/blob/main/templates/webpack.config.mjs) template, if you're curious how it all looks like.__

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
  - Running the production/development bundle using Hermes engine
  - Transforming production bundle into bytecode bundle
  - Inspecting running Hermes engine with Flipper
- [x] [Code splitting](https://re-pack.netlify.app/docs/code-splitting/concept) (__experimental__):
  - Dynamic `import()` support with and without `React.lazy()` (recommended).
  - Arbitrary scripts (only for advanced users).
- [x] REST API for development server:
  - `GET /api/platforms` - platforms with active compilations.
  - `GET /api/:platform/assets` - assets emitted from compilation.
  - `GET /api/:platform/stats` - data about compilation.
- [x] [Module Federation](https://medium.com/swlh/webpack-5-module-federation-a-game-changer-to-javascript-architecture-bcdd30e02669) support

### Planned features

Available at: [Projects](https://github.com/callstack/repack/projects?type=classic)

- [ ] `ChunksToHermesBytecodePlugin` plugin to automatically transform async chunks to bytecode format.
- [ ] Code signing and verification
- [ ] `webpack-init` command

### New Architecture Support
----
This library supports new architecture!. [turbo module](https://reactnative.dev/docs/next/the-new-architecture/pillars-turbomodules) offers a new architecture for initializing native modules.

If you are using this library in your own project or [running the example](https://github.com/callstack/repack/blob/main/CONTRIBUTING.md#running-the-example), there are some extra steps needed.

### iOS
Install pods with this flag inside `ios` folder: 
```sh
RCT_NEW_ARCH_ENABLED=1 bundle exec pod install
``` 
and then run:

```sh
yarn ios
``` 

### Android
Set `newArchEnabled` to `true` inside `android/gradle.properties` and then run: 
```sh
yarn android
```

### Examples

Explore examples of React Native applications using Re.Pack here: https://github.com/callstack/repack-examples.

## Documentation

The documentation is available at: https://re-pack.netlify.app/

You can also use the following links to jump to specific topics:

- [About Re.Pack](https://re-pack.netlify.app/docs/about)
- [Getting Started](https://re-pack.netlify.app/docs/getting-started)
- [Configuration](https://re-pack.netlify.app/docs/configuration/webpack-config)
- [API documentation](https://re-pack.netlify.app/docs/api/index)
- [Known issues & limitations](https://re-pack.netlify.app/docs/known-issues)
- [Code splitting](https://re-pack.netlify.app/docs/code-splitting/concept)

## Made with ❤️ at Callstack

`@callstack/repack` is an open source project and will always remain free to use. If you think it's cool, please star it 🌟. [Callstack][callstack-readme-with-love] is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

Like the project? ⚛️ [Join the team](https://callstack.com/careers/?utm_campaign=Senior_RN&utm_source=github&utm_medium=readme) who does amazing stuff for clients and drives React Native Open Source! 🔥

<!-- badges -->
[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=react-native-paper&utm_term=readme-with-love
[goto-installation-badge]: https://img.shields.io/badge/go%20to-Installation-blue?style=flat-square
[goto-installation]: https://re-pack.netlify.app/docs/getting-started#installation
[goto-usage-badge]: https://img.shields.io/badge/go%20to-Usage-blue?style=flat-square
[goto-usage]: https://re-pack.netlify.app/docs/getting-started#usage
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

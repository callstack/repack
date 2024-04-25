<p align="center">
  <img src="./logo.png">
</p>
<p align="center">
A Webpack-based toolkit to build your React Native application with full support of Webpack ecosystem.
</p>

---

[![Build Status][build-badge]][build]
[![Version][version-badge]][version]
[![MIT License][license-badge]][license]
[![Chat][chat-badge]][chat]
[![PRs Welcome][prs-welcome-badge]][prs-welcome]
[![Code of Conduct][coc-badge]][coc]
[![Sponsored by Callstack][callstack-badge]][callstack]

Re.Pack is a next generation of [Haul](https://github.com/callstack/haul) — a Webpack-based bundler for React Native applications.

Re.Pack uses Webpack 5 and React Native CLI's plugin system to allow you to bundle your application using Webpack and allow to easily switch from Metro.

**Check the base [`webpack.config.cjs`](https://github.com/callstack/repack/blob/main/templates/webpack.config.cjs) or [`webpack.config.mjs`](https://github.com/callstack/repack/blob/main/templates/webpack.config.mjs) template, if you're curious how it all looks like.**

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
  - `ChunksToHermesBytecodePlugin` plugin to transform async chunks into Hermes bytecode
- [x] [Code splitting](https://re-pack.dev/docs/code-splitting/concept) (**experimental**):
  - Dynamic `import()` support with and without `React.lazy()` (recommended).
  - Arbitrary scripts (only for advanced users).
- [x] REST API for development server:
  - `GET /api/platforms` - platforms with active compilations.
  - `GET /api/:platform/assets` - assets emitted from compilation.
  - `GET /api/:platform/stats` - data about compilation.
- [x] [Module Federation](https://medium.com/swlh/webpack-5-module-federation-a-game-changer-to-javascript-architecture-bcdd30e02669) support
- [x] Code signing and verification
- [x] `@callstack/repack-init` - tool that automates the integration of the Re.Pack into React Native projects

### Examples

Explore examples of React Native applications using Re.Pack here: https://github.com/callstack/repack-examples.

For a more comprehensive example of a Super App setup with Module Federation please visit our [Super App Showcase repository](https://github.com/callstack/super-app-showcase).

## Documentation

The documentation is available at: https://re-pack.dev

You can also use the following links to jump to specific topics:

- [About Re.Pack](https://re-pack.dev/docs/about)
- [Getting Started](https://re-pack.dev/docs/getting-started)
- [Configuration](https://re-pack.dev/docs/configuration/webpack-config)
- [API documentation](https://re-pack.dev/api/about)
- [Known issues & limitations](https://re-pack.dev/docs/known-issues)
- [Code splitting](https://re-pack.dev/docs/code-splitting/concept)

## Made with ❤️ at Callstack

`@callstack/repack` is an open source project and will always remain free to use. If you think it's cool, please star it 🌟. [Callstack][callstack-readme-with-love] is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

Like the project? ⚛️ [Join the team](https://callstack.com/careers/?utm_campaign=Senior_RN&utm_source=github&utm_medium=readme) who does amazing stuff for clients and drives React Native Open Source! 🔥

<!-- badges -->

[callstack-readme-with-love]: https://callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=react-native-paper&utm_term=readme-with-love
[build-badge]: https://img.shields.io/github/actions/workflow/status/callstack/repack/test.yml?style=flat-square
[build]: https://github.com/callstack/repack/actions/workflows/test.yml
[version-badge]: https://img.shields.io/npm/v/@callstack/repack?style=flat-square
[version]: https://www.npmjs.com/package/@callstack/repack
[license-badge]: https://img.shields.io/npm/l/@callstack/repack?style=flat-square
[license]: https://github.com/callstack/repack/blob/master/LICENSE
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs-welcome]: ./CONTRIBUTING.md
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/callstack/repack/blob/master/CODE_OF_CONDUCT.md
[chat-badge]: https://img.shields.io/discord/426714625279524876.svg?style=flat-square&colorB=758ED3
[chat]: https://discord.gg/Q4yr2rTWYF
[callstack-badge]: https://callstack.com/images/callstack-badge.svg
[callstack]: https://callstack.com/open-source/?utm_source=github.com&utm_medium=referral&utm_campaign=repack&utm_term=readme-badge
